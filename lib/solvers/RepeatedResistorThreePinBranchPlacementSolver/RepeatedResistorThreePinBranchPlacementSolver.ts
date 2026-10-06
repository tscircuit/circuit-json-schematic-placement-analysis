import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort, SourcePort } from "circuit-json"
import type {
  RepeatedBranchesStaggered,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type ComponentPort = SourcePort & { source_component_id: string }
type Branch = {
  hostPin: SchematicPort
  resistor: SchematicBoxPlacement
  endpoint: SchematicBoxPlacement
  endpointPin: SchematicPort
  groundPin: SchematicPort
  externalPin: SchematicPort
  endpointType: string
  groundNet: string
  externalNet: string
}

/**
 * Compare three or more repeated host-pin → resistor → three-pin-component
 * branches sharing an explicit ground net, without inferring terminal roles.
 */
export class RepeatedResistorThreePinBranchPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly hostIds: string[]
  private readonly unpopulated = new Set<string>()
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    for (const element of params.ctx.circuitJson)
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
    this.hostIds = [...this.index.portsByComponent]
      .filter(([, ports]) => ports.length >= 3)
      .map(([id]) => id)
    this.solved = this.hostIds.length === 0
  }

  override _step(): void {
    const hostId = this.hostIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.hostIds.length
    if (!hostId) return
    const host = this.index.placement(hostId)
    if (!host || !validBox(host) || this.unpopulated.has(hostId)) return
    const groups: Branch[][] = []
    for (const port of this.index.portsByComponent.get(hostId) ?? []) {
      const branch = this.readBranch(port, host)
      if (!branch) continue
      const group = groups.find((group) =>
        equivalentBranches(group[0]!, branch),
      )
      if (group) group.push(branch)
      else groups.push([branch])
    }
    for (const branches of groups) {
      if (
        branches.length < 3 ||
        new Set(branches.map((b) => b.endpoint.sourceComponentId)).size !==
          branches.length ||
        new Set(branches.map((b) => b.externalNet)).size !== branches.length
      )
        continue
      const horizontal =
        branches[0]!.hostPin.facing_direction === "left" ||
        branches[0]!.hostPin.facing_direction === "right"
      const depth = (point: { x: number; y: number }) =>
        horizontal ? point.x : point.y
      const across = (point: { x: number; y: number }) =>
        horizontal ? point.y : point.x
      const extent = (box: SchematicBoxPlacement) =>
        horizontal ? box.width : box.height
      branches.sort(
        (a, b) => across(a.hostPin.center) - across(b.hostPin.center),
      )
      const hostPins = branches.map((branch) => branch.hostPin.center)
      // Pins must form one bank, rather than unrelated faces of a custom symbol.
      if (spread(hostPins.map(depth)) > 0.1) continue
      const hostSpan = spread(hostPins.map(across))
      if (hostSpan < 0.1) continue
      const resistorDepthSpread = spread(
        branches.map((b) => (horizontal ? b.resistor.schX : b.resistor.schY)),
      )
      const endpointDepthSpread = spread(
        branches.map((b) => depth(b.endpointPin.center)),
      )
      // Allow label clearance and modest staggering. Require both stages to be
      // substantially staggered; a long but consistently arranged bank is valid.
      const resistorAllowance = Math.max(
        1.5,
        2 * Math.max(...branches.map((b) => extent(b.resistor))),
      )
      const endpointAllowance = Math.max(
        3,
        2 * hostSpan,
        2 * Math.max(...branches.map((b) => extent(b.endpoint))),
      )
      if (
        resistorDepthSpread <= resistorAllowance ||
        endpointDepthSpread <= endpointAllowance
      )
        continue
      const names = branches.map(
        (b) =>
          `${b.resistor.sourceComponentName} / ${b.endpoint.sourceComponentName}`,
      )
      this.params.issues.push({
        lineItemType: "RepeatedBranchesStaggered",
        hostSchematicBox: host,
        resistorSchematicBoxes: branches.map((b) => b.resistor),
        endpointSchematicBoxes: branches.map((b) => b.endpoint),
        branchAxis: horizontal ? "horizontal" : "vertical",
        resistorDepthSpread,
        endpointDepthSpread,
        message: `Arrange the repeated branches ${names.join(", ")} in adjacent parallel ${horizontal ? "rows" : "columns"} beside ${host.sourceComponentName}. Their resistors and connected components are staggered along the branch direction. Preserve every pin connection, allow room for labels, and reroute affected traces; exact alignment is not required.`,
      })
    }
  }

  private readBranch(
    hostPort: ComponentPort,
    host: SchematicBoxPlacement,
  ): Branch | undefined {
    const index = this.index
    const hostPin = index.port(hostPort)
    if (
      !validPin(hostPin) ||
      hostPin.schematic_sheet_id !== host.schematicSheetId ||
      hostPort.do_not_connect ||
      supplyPort(hostPort)
    )
      return
    const resistorPort = this.onlyPeer(hostPort)
    if (!resistorPort) return
    const resistorId = resistorPort.source_component_id
    const component = index.components.get(resistorId)
    const resistor = index.placement(resistorId)
    const resistorPorts = index.portsByComponent.get(resistorId)
    if (
      component?.ftype !== "simple_resistor" ||
      !Number.isFinite(component.resistance) ||
      component.resistance <= 0 ||
      !resistor ||
      !validBox(resistor) ||
      resistorPorts?.length !== 2 ||
      this.unpopulated.has(resistorId) ||
      !index.sameLocalScope(host, resistor) ||
      resistorPorts.some(
        (p) =>
          p.do_not_connect ||
          supplyPort(p) ||
          !validPin(index.port(p)) ||
          index.port(p)!.schematic_sheet_id !== resistor.schematicSheetId,
      )
    )
      return
    const farPort = resistorPorts.find(
      (p) => p.source_port_id !== resistorPort.source_port_id,
    )!
    const endpointPort = this.onlyPeer(farPort)
    if (
      !endpointPort ||
      endpointPort.source_component_id === hostPort.source_component_id
    )
      return
    const endpointId = endpointPort.source_component_id
    const endpoint = index.placement(endpointId)
    const endpointComponent = index.components.get(endpointId)
    const ports = index.portsByComponent.get(endpointId)
    if (
      !endpoint ||
      !validBox(endpoint) ||
      !endpointComponent ||
      ports?.length !== 3 ||
      this.unpopulated.has(endpointId) ||
      !index.sameLocalScope(host, endpoint) ||
      ports.some(
        (p) =>
          p.do_not_connect ||
          !validPin(index.port(p)) ||
          index.port(p)!.schematic_sheet_id !== endpoint.schematicSheetId,
      )
    )
      return
    const remaining = ports.filter(
      (p) => p.source_port_id !== endpointPort.source_port_id,
    )
    const grounds = remaining.filter((p) =>
      index.groundNets.has(index.connected(p.source_port_id)),
    )
    if (grounds.length !== 1 || supplyPort(endpointPort)) return
    const external = remaining.find((p) => p !== grounds[0])!
    const externalNet = index.connected(external.source_port_id)
    if (
      index.isRail(externalNet) ||
      supplyPort(external) ||
      externalNet === index.connected(endpointPort.source_port_id)
    )
      return
    const endpointPin = index.port(endpointPort)!
    const direction = hostPin.facing_direction
    if (!direction || !endpointPin.facing_direction) return
    const horizontal = direction === "left" || direction === "right"
    const sign = direction === "left" || direction === "down" ? -1 : 1
    const forward = (x: number, y: number) =>
      sign * (horizontal ? x - hostPin.center.x : y - hostPin.center.y)
    if (
      forward(resistor.schX, resistor.schY) <= 0 ||
      forward(endpointPin.center.x, endpointPin.center.y) <=
        forward(resistor.schX, resistor.schY)
    )
      return
    return {
      hostPin,
      resistor,
      endpoint,
      endpointPin,
      groundPin: index.port(grounds[0]!)!,
      externalPin: index.port(external)!,
      endpointType: endpointComponent.ftype,
      groundNet: index.connected(grounds[0]!.source_port_id),
      externalNet,
    }
  }

  private onlyPeer(port: ComponentPort): ComponentPort | undefined {
    const net = this.index.connected(port.source_port_id)
    const members = this.index.portsByNet.get(net)
    if (this.index.isRail(net) || members?.length !== 2) return
    return members.find(
      (p) => p.source_component_id !== port.source_component_id,
    )
  }

  static issueToString(issue: RepeatedBranchesStaggered): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "resistors",
      issue.resistorSchematicBoxes.map((b) => b.sourceComponentName).join(","),
    )
    addAttr(
      attrs,
      "connectedComponents",
      issue.endpointSchematicBoxes.map((b) => b.sourceComponentName).join(","),
    )
    addAttr(attrs, "branchAxis", issue.branchAxis)
    addAttr(attrs, "resistorDepthSpread", issue.resistorDepthSpread)
    addAttr(attrs, "endpointDepthSpread", issue.endpointDepthSpread)
    addAttr(attrs, "message", issue.message)
    return `<RepeatedBranchesStaggered ${attrs.join(" ")} />`
  }
}

function equivalentBranches(a: Branch, b: Branch): boolean {
  if (
    a.hostPin.facing_direction !== b.hostPin.facing_direction ||
    a.endpointPin.facing_direction !== b.endpointPin.facing_direction ||
    a.endpointType !== b.endpointType ||
    a.groundNet !== b.groundNet
  )
    return false
  // Corresponding branch, shared-ground and external pins must have matching
  // geometry. No terminal function is inferred from the drawing or its labels.
  return (
    sameOffset(a.groundPin, a.endpointPin, b.groundPin, b.endpointPin) &&
    sameOffset(a.externalPin, a.endpointPin, b.externalPin, b.endpointPin)
  )
}
function sameOffset(
  p: SchematicPort,
  originP: SchematicPort,
  q: SchematicPort,
  originQ: SchematicPort,
): boolean {
  return (
    p.facing_direction === q.facing_direction &&
    Math.abs(p.center.x - originP.center.x - (q.center.x - originQ.center.x)) <
      0.01 &&
    Math.abs(p.center.y - originP.center.y - (q.center.y - originQ.center.y)) <
      0.01
  )
}

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values)
}
function validBox(box: SchematicBoxPlacement): boolean {
  return (
    [box.schX, box.schY, box.width, box.height].every(Number.isFinite) &&
    box.width > 0 &&
    box.height > 0
  )
}
function validPin(pin: SchematicPort | undefined): pin is SchematicPort {
  return !!pin && Number.isFinite(pin.center.x) && Number.isFinite(pin.center.y)
}
function supplyPort(port: SourcePort): boolean {
  return !!(
    port.requires_power ||
    port.provides_power ||
    port.requires_ground ||
    port.provides_ground ||
    port.requires_voltage !== undefined ||
    port.provides_voltage !== undefined
  )
}
