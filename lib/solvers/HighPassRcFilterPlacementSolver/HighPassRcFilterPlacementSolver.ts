import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  HighPassRcFilterComponentsNotGrouped,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

type ComponentPort = SourcePort & { source_component_id: string }

/** A series capacitor feeding one grounded resistor and one local load terminal. */
export class HighPassRcFilterPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly capacitorIds: string[]
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
    for (const element of params.ctx.circuitJson) {
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
      if (element.type !== "source_port") continue
      const net = this.index.connected(element.source_port_id)
      if (element.requires_ground || element.provides_ground)
        this.index.groundNets.add(net)
      if (
        element.requires_power ||
        element.provides_power ||
        element.requires_voltage !== undefined ||
        element.provides_voltage !== undefined
      )
        this.index.powerNets.add(net)
    }
    this.capacitorIds = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_capacitor")
      .map((c) => c.source_component_id)
    this.solved = this.capacitorIds.length === 0
  }

  override _step(): void {
    const id = this.capacitorIds[this.currentIndex++]!
    this.solved = this.currentIndex >= this.capacitorIds.length
    const component = this.index.components.get(id)
    const capacitor = this.localPart(id)
    const nets = this.index.twoTerminalNets(id)
    if (
      component?.ftype !== "simple_capacitor" ||
      !Number.isFinite(component.capacitance) ||
      component.capacitance <= 0 ||
      !capacitor ||
      !nets ||
      nets.some((net) => this.index.isRail(net))
    )
      return

    // Pair by connectivity before considering distance. Two qualifying ends are ambiguous.
    const pairs = capacitor.ports.flatMap((port) => {
      const pair = this.pairAt(port)
      return pair ? [{ ...pair, capacitorPort: port }] : []
    })
    if (pairs.length !== 1) return
    const { resistor, resistorPort, capacitorPort, hostId } = pairs[0]!
    const index = this.index
    const signal = index.connected(capacitorPort.source_port_id)
    const input = nets.find((net) => net !== signal)!
    // A return to the same host may be feedback, not a coupling branch.
    if (
      (index.portsByNet.get(input) ?? []).some(
        (p) => p.source_component_id === hostId,
      )
    )
      return
    if (!index.sameLocalScope(capacitor.placement, resistor.placement)) return
    const c = capacitor.placement,
      r = resistor.placement
    if (
      Math.abs(c.schX - r.schX) < (c.width + r.width) / 2 &&
      Math.abs(c.schY - r.schY) < (c.height + r.height) / 2
    )
      return
    const first = index.port(capacitorPort)!,
      second = index.port(resistorPort)!
    const signalPinDistance = Math.hypot(
      first.center.x - second.center.x,
      first.center.y - second.center.y,
    )
    // Readability allowance in schematic units, not an electrical/PCB distance limit.
    const maxRecommendedSignalPinDistance = Math.max(
      4,
      3 * Math.max(c.width, c.height, r.width, r.height),
    )
    if (signalPinDistance <= maxRecommendedSignalPinDistance) return
    this.params.issues.push({
      lineItemType: "HighPassRcFilterComponentsNotGrouped",
      capacitorSchematicBox: c,
      resistorSchematicBox: r,
      capacitorSourcePortId: capacitorPort.source_port_id,
      resistorSourcePortId: resistorPort.source_port_id,
      signalPinDistance,
      maxRecommendedSignalPinDistance,
      message: `Group ${c.sourceComponentName || "the capacitor"} and ${r.sourceComponentName || "the resistor"} at their shared node so the series capacitor and grounded resistor can be read together. Preserve pin connections, leave room for labels, and reroute affected traces; exact alignment is not required.`,
    })
  }

  private pairAt(capacitorPort: ComponentPort) {
    const index = this.index,
      capId = capacitorPort.source_component_id
    const peers =
      index.portsByNet.get(index.connected(capacitorPort.source_port_id)) ?? []
    // Exactly C + R + one chip/connector terminal. Banks and other branches are ambiguous.
    if (peers.length !== 3 || peers.some((p) => p.do_not_connect)) return
    const resistorPorts = peers.filter(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_resistor",
    )
    if (resistorPorts.length !== 1) return
    const resistorPort = resistorPorts[0]!,
      id = resistorPort.source_component_id
    const component = index.components.get(id),
      resistor = this.localPart(id)
    if (
      component?.ftype !== "simple_resistor" ||
      !Number.isFinite(component.resistance) ||
      component.resistance <= 0 ||
      !resistor
    )
      return
    const nets = index.twoTerminalNets(id)
    const ground = nets?.find(
      (net) => net !== index.connected(resistorPort.source_port_id),
    )
    if (!ground || !index.groundNets.has(ground) || index.powerNets.has(ground))
      return
    const hostPort = peers.find(
      (p) => p.source_component_id !== capId && p.source_component_id !== id,
    )
    if (!hostPort) return
    const hostId = hostPort.source_component_id,
      host = index.placement(hostId)
    const type = index.components.get(hostId)?.ftype
    if (
      (type !== "simple_chip" && type !== "simple_op_amp") ||
      (index.portsByComponent.get(hostId)?.length ?? 0) < 3 ||
      this.unpopulated.has(hostId) ||
      !host ||
      !index.sameLocalScope(resistor.placement, host) ||
      !this.validPin(hostPort, host.schematicSheetId)
    )
      return
    return { resistor, resistorPort, hostId }
  }

  private localPart(id: string) {
    const placement = this.index.placement(id),
      ports = this.index.portsByComponent.get(id)
    if (
      this.unpopulated.has(id) ||
      !placement ||
      ports?.length !== 2 ||
      ![
        placement.schX,
        placement.schY,
        placement.width,
        placement.height,
      ].every(Number.isFinite) ||
      placement.width <= 0 ||
      placement.height <= 0 ||
      ports.some((p) => !this.validPin(p, placement.schematicSheetId))
    )
      return
    return { placement, ports }
  }

  private validPin(port: ComponentPort, sheetId?: string) {
    const pin = this.index.port(port)
    return (
      !port.do_not_connect &&
      pin &&
      pin.schematic_sheet_id === sheetId &&
      Number.isFinite(pin.center.x) &&
      Number.isFinite(pin.center.y)
    )
  }

  static issueToString(issue: HighPassRcFilterComponentsNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "signalPinDistance", issue.signalPinDistance)
    addAttr(
      attrs,
      "maxRecommendedSignalPinDistance",
      issue.maxRecommendedSignalPinDistance,
    )
    addAttr(attrs, "message", issue.message)
    return `<HighPassRcFilterComponentsNotGrouped ${attrs.join(" ")} />`
  }
}
