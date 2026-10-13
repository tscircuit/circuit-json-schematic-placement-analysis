import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  SchematicPlacementIssue,
  SeriesRcFilterComponentsNotGrouped,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** A series signal resistor with a single grounded capacitor at its other end. */
export class SeriesRcFilterPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly resistorIds: string[]
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
    this.resistorIds = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_resistor")
      .map((c) => c.source_component_id)
    this.solved = this.resistorIds.length === 0
  }

  override _step(): void {
    const id = this.resistorIds[this.currentIndex++]!
    this.solved = this.currentIndex >= this.resistorIds.length
    const index = this.index
    const component = index.components.get(id)
    const resistor = this.localPart(id)
    const nets = index.twoTerminalNets(id)
    if (
      component?.ftype !== "simple_resistor" ||
      !Number.isFinite(component.resistance) ||
      component.resistance <= 0 ||
      !resistor ||
      !nets ||
      nets.some((net) => index.isRail(net))
    )
      return

    // Exactly one end is a private chip-to-resistor connection. This excludes
    // parallel RC branches, dividers, C–R–C filters and cascaded resistor networks.
    const hosts = nets.flatMap((net) => {
      const peers = index.portsByNet.get(net) ?? []
      if (peers.length !== 2 || peers.some((p) => p.do_not_connect)) return []
      const chipPort = peers.find((p) => p.source_component_id !== id)!
      const hostId = chipPort.source_component_id
      const host = index.placement(hostId)
      const type = index.components.get(hostId)?.ftype
      if (
        (type !== "simple_chip" && type !== "simple_op_amp") ||
        (index.portsByComponent.get(hostId)?.length ?? 0) < 3 ||
        this.unpopulated.has(hostId) ||
        !host ||
        !index.sameLocalScope(resistor.placement, host)
      )
        return []
      return [{ net, hostId }]
    })
    if (hosts.length !== 1) return
    const host = hosts[0]!
    const signal = nets.find((net) => net !== host.net)!
    const peers = index.portsByNet.get(signal) ?? []
    if (
      peers.some(
        (p) => p.do_not_connect || p.source_component_id === host.hostId,
      )
    )
      return
    const capacitorPorts = peers.filter(
      (p) =>
        index.components.get(p.source_component_id)?.ftype ===
        "simple_capacitor",
    )
    // A bank or an additional series capacitor does not identify a unique pair.
    if (capacitorPorts.length !== 1) return
    const capacitorPort = capacitorPorts[0]!
    const capId = capacitorPort.source_component_id
    const cap = index.components.get(capId)
    const capacitor = this.localPart(capId)
    const capNets = index.twoTerminalNets(capId)
    const ground = capNets?.find((net) => net !== signal)
    if (
      cap?.ftype !== "simple_capacitor" ||
      !Number.isFinite(cap.capacitance) ||
      cap.capacitance <= 0 ||
      !capacitor ||
      !ground ||
      !index.groundNets.has(ground) ||
      index.powerNets.has(ground) ||
      !index.sameLocalScope(resistor.placement, capacitor.placement)
    )
      return
    // Other local passive branches make the pairing ambiguous. A load on
    // another sheet can remain connected through the existing source net.
    if (
      peers.some((p) => {
        if (p.source_component_id === id || p.source_component_id === capId)
          return false
        const type = index.components.get(p.source_component_id)?.ftype
        if (type === "simple_chip" || type === "simple_op_amp") return false
        const placement = index.placement(p.source_component_id)
        return (
          !placement ||
          placement.schematicSheetId === resistor.placement.schematicSheetId
        )
      })
    )
      return
    const r = resistor.placement,
      c = capacitor.placement
    if (
      Math.abs(r.schX - c.schX) < (r.width + c.width) / 2 &&
      Math.abs(r.schY - c.schY) < (r.height + c.height) / 2
    )
      return
    const resistorPort = resistor.ports.find(
      (p) => index.connected(p.source_port_id) === signal,
    )!
    const first = index.port(resistorPort)!,
      second = index.port(capacitorPort)!
    const signalPinDistance = Math.hypot(
      first.center.x - second.center.x,
      first.center.y - second.center.y,
    )
    // Schematic readability allowance, not an electrical or PCB layout limit.
    const maxRecommendedSignalPinDistance = Math.max(
      4,
      3 * Math.max(r.width, r.height, c.width, c.height),
    )
    if (signalPinDistance <= maxRecommendedSignalPinDistance) return
    this.params.issues.push({
      lineItemType: "SeriesRcFilterComponentsNotGrouped",
      resistorSchematicBox: r,
      capacitorSchematicBox: c,
      resistorSourcePortId: resistorPort.source_port_id,
      capacitorSourcePortId: capacitorPort.source_port_id,
      signalPinDistance,
      maxRecommendedSignalPinDistance,
      message: `Group ${r.sourceComponentName || "the resistor"} and ${c.sourceComponentName || "the capacitor"} so the series signal path and its grounded capacitor can be read together. Preserve all pin connections, leave room for labels, and reroute affected traces; exact alignment is not required.`,
    })
  }

  private localPart(id: string) {
    const placement = this.index.placement(id)
    const ports = this.index.portsByComponent.get(id)
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

  private validPin(
    port: SourcePort & { source_component_id: string },
    sheetId?: string,
  ) {
    const pin = this.index.port(port)
    return (
      !port.do_not_connect &&
      pin &&
      pin.schematic_sheet_id === sheetId &&
      Number.isFinite(pin.center.x) &&
      Number.isFinite(pin.center.y)
    )
  }

  static issueToString(issue: SeriesRcFilterComponentsNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "resistorName",
      issue.resistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "signalPinDistance", issue.signalPinDistance)
    addAttr(
      attrs,
      "maxRecommendedSignalPinDistance",
      issue.maxRecommendedSignalPinDistance,
    )
    addAttr(attrs, "message", issue.message)
    return `<SeriesRcFilterComponentsNotGrouped ${attrs.join(" ")} />`
  }
}
