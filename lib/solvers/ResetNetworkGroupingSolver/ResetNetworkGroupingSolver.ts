import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  ResetNetworkNotGrouped,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { getSourceConnectivity } from "../../utils/source-connectivity"
import type { SolverContext } from "../SolverContext"

interface ResetNetwork {
  host: SchematicBoxPlacement
  pin: SourcePort
  pinPosition: { x: number; y: number }
  members: SchematicBoxPlacement[]
}

export class ResetNetworkGroupingSolver extends BaseSolver {
  // Readability heuristic in schematic units, not an electrical/PCB constraint.
  // Measure from the reset pin, so a large host symbol does not cause a warning.
  private static readonly MIN_DISTANCE = 6
  private readonly networks: ResetNetwork[]
  private index = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.networks = this.findNetworks(params.ctx)
    this.solved = this.networks.length === 0
  }

  override _step(): void {
    const network = this.networks[this.index]!
    // A test point may intentionally live in a separate debug area. It adds
    // context but cannot by itself make an otherwise compact RC network wrong.
    const rcMembers = network.members.slice(0, 2)
    const threshold = Math.max(
      ResetNetworkGroupingSolver.MIN_DISTANCE,
      ...rcMembers.map((p) => 3 * Math.max(p.width, p.height)),
    )
    const distances = rcMembers.map((p) =>
      Math.hypot(
        Math.max(0, Math.abs(p.schX - network.pinPosition.x) - p.width / 2),
        Math.max(0, Math.abs(p.schY - network.pinPosition.y) - p.height / 2),
      ),
    )
    if (distances.some((distance) => distance > threshold)) {
      const hostName =
        network.host.sourceComponentName ?? network.host.schematicComponentId
      const resetPin = resetPinName(network.pin)!
      const memberNames = rcMembers
        .map((p) => p.sourceComponentName ?? p.schematicComponentId)
        .join(", ")
      this.params.issues.push({
        lineItemType: "ResetNetworkNotGrouped",
        hostSchematicBox: network.host,
        resetSourcePortId: network.pin.source_port_id,
        resetPinName: resetPin,
        supportComponents: network.members,
        maxDistanceFromResetPin: Math.round(Math.max(...distances) * 100) / 100,
        maxRecommendedDistance: threshold,
        message: `Group ${memberNames} near ${hostName}.${resetPin} so the reset pull-up and capacitor can be read together. Preserve all net connections; associated test points may remain in a debug area.`,
      })
    }
    this.index++
    this.solved = this.index >= this.networks.length
  }

  private findNetworks(ctx: SolverContext): ResetNetwork[] {
    const root = getSourceConnectivity(ctx.circuitJson)
    const sources = ctx.circuitJson.filter((e) => e.type === "source_component")
    const sourceById = new Map(sources.map((e) => [e.source_component_id, e]))
    const ports = ctx.circuitJson.filter((e) => e.type === "source_port")
    const portsByComponent = new Map<string, SourcePort[]>()
    const portsByNet = new Map<string, SourcePort[]>()
    const power = new Set<string>()
    const ground = new Set<string>()
    for (const port of ports) {
      if (!port.source_component_id) continue
      const componentPorts =
        portsByComponent.get(port.source_component_id) ?? []
      componentPorts.push(port)
      portsByComponent.set(port.source_component_id, componentPorts)
      const net = root(port.source_port_id)
      const netPorts = portsByNet.get(net) ?? []
      netPorts.push(port)
      portsByNet.set(net, netPorts)
      if (port.provides_power || port.requires_power) power.add(net)
      if (port.provides_ground || port.requires_ground) ground.add(net)
    }
    for (const element of ctx.circuitJson) {
      if (element.type !== "source_net") continue
      if (element.is_power || element.is_positive_voltage_source)
        power.add(root(element.source_net_id))
      if (element.is_ground) ground.add(root(element.source_net_id))
    }
    const placementBySource = new Map(
      ctx.componentPlacements.flatMap((p) =>
        p.sourceComponentId ? [[p.sourceComponentId, p] as const] : [],
      ),
    )
    const schematicPorts = ctx.circuitJson.filter(
      (e) => e.type === "schematic_port",
    )
    const schematicComponents = new Map(
      ctx.circuitJson
        .filter((e) => e.type === "schematic_component")
        .map((e) => [e.schematic_component_id, e]),
    )
    const networks: ResetNetwork[] = []
    const seen = new Set<string>()

    for (const pin of ports) {
      if (!pin.source_component_id || !resetPinName(pin) || pin.do_not_connect)
        continue
      if (sourceById.get(pin.source_component_id)?.ftype !== "simple_chip")
        continue
      const net = root(pin.source_port_id)
      if (seen.has(net) || power.has(net) || ground.has(net)) continue
      seen.add(net)
      const peers = portsByNet.get(net) ?? []
      // Shared reset nets (or another active device driving reset) have no
      // unambiguous single host. Leave their block organization to the author.
      const chips = new Set(
        peers
          .filter(
            (p) =>
              p.source_component_id &&
              sourceById.get(p.source_component_id)?.ftype === "simple_chip",
          )
          .map((p) => p.source_component_id),
      )
      if (chips.size !== 1) continue
      const host = placementBySource.get(pin.source_component_id)
      const schematicPin = schematicPorts.find(
        (p) =>
          p.source_port_id === pin.source_port_id &&
          p.schematic_component_id === host?.schematicComponentId,
      )
      if (
        !host ||
        !schematicPin ||
        schematicPin.schematic_sheet_id !== host.schematicSheetId
      )
        continue

      const pullups: SchematicBoxPlacement[] = []
      const capacitors: SchematicBoxPlacement[] = []
      const testpoints: SchematicBoxPlacement[] = []
      let unsupported = false
      for (const id of new Set(peers.map((p) => p.source_component_id))) {
        if (!id || id === pin.source_component_id) continue
        const type = sourceById.get(id)?.ftype
        const componentPorts = portsByComponent.get(id) ?? []
        const placement = placementBySource.get(id)
        if (type === "simple_connector" || type === "simple_pin_header")
          continue
        if (!placement) {
          unsupported = true
          break
        }
        if (type === "simple_test_point" && componentPorts.length === 1) {
          testpoints.push(placement)
          continue
        }
        if (componentPorts.length !== 2) {
          unsupported = true
          break
        }
        const other = componentPorts.find((p) => root(p.source_port_id) !== net)
        if (!other) {
          unsupported = true
          break
        }
        const otherNet = root(other.source_port_id)
        if (
          type === "simple_resistor" &&
          power.has(otherNet) &&
          !ground.has(otherNet)
        )
          pullups.push(placement)
        else if (
          type === "simple_capacitor" &&
          ground.has(otherNet) &&
          !power.has(otherNet)
        )
          capacitors.push(placement)
        else {
          unsupported = true
          break
        }
      }
      // Deliberately start with a simple RC reset network, not arbitrary
      // filters, decouplers, active reset controllers, or multiple pull-ups.
      if (unsupported || pullups.length !== 1 || capacitors.length !== 1)
        continue
      const members = [...pullups, ...capacitors, ...testpoints]
      const hostGroup = host.schematicComponentId
        ? schematicComponents.get(host.schematicComponentId)?.schematic_group_id
        : undefined
      if (
        members.some((member) => {
          const group = member.schematicComponentId
            ? schematicComponents.get(member.schematicComponentId)
                ?.schematic_group_id
            : undefined
          return (
            member.schematicSheetId !== host.schematicSheetId ||
            member.subcircuitId !== host.subcircuitId ||
            group !== hostGroup
          )
        })
      )
        continue
      networks.push({ host, pin, pinPosition: schematicPin.center, members })
    }
    return networks
  }

  static issueToString(issue: ResetNetworkNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "resetPin", issue.resetPinName)
    addAttr(
      attrs,
      "supportComponents",
      issue.supportComponents
        .map((p) => p.sourceComponentName ?? p.schematicComponentId)
        .join(","),
    )
    addAttr(attrs, "maxDistanceFromResetPin", issue.maxDistanceFromResetPin)
    addAttr(attrs, "maxRecommendedDistance", issue.maxRecommendedDistance)
    addAttr(attrs, "message", issue.message)
    return `<ResetNetworkNotGrouped ${attrs.join(" ")} />`
  }
}

const resetPinName = (port: SourcePort): string | undefined =>
  [port.name, ...(port.port_hints ?? [])].find((name) =>
    /^N?(RESET|RST)(N|B)?$/.test(name.toUpperCase().replace(/[_\-!~#/]/g, "")),
  )
