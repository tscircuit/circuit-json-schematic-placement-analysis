import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  MosfetGateNetworkNotGrouped,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** A local series-gate / gate-source resistor pair scattered away from its MOSFET. */
export class MosfetGateNetworkPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly mosfetIds: string[]
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.index = new PlacementNetworkIndex(params.ctx)
    this.mosfetIds = [...this.index.components.keys()].filter((id) =>
      this.mosfetPorts(id),
    )
    this.solved = this.mosfetIds.length === 0
  }

  override _step(): void {
    const id = this.mosfetIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.mosfetIds.length
    if (!id) return
    const index = this.index
    const mosfet = index.placement(id)
    const roles = this.mosfetPorts(id)!
    if (!mosfet) return
    const gateNet = index.connected(roles.gate.source_port_id)
    const sourceNet = index.connected(roles.sources[0]!.source_port_id)
    const drainNet = index.connected(roles.drains[0]!.source_port_id)
    if (
      new Set([gateNet, sourceNet, drainNet]).size !== 3 ||
      index.isRail(gateNet)
    )
      return
    if (
      [roles.gate, ...roles.sources, ...roles.drains].some((p) => {
        const pin = index.port(p)
        return !pin || pin.schematic_sheet_id !== mosfet.schematicSheetId
      })
    )
      return

    // Shared gates, parallel bias resistors, and additional gate protection
    // branches need their own policy; do not choose an arbitrary pair.
    const peers = (index.portsByNet.get(gateNet) ?? []).filter(
      (p) => p.source_component_id !== id,
    )
    if (peers.length !== 2) return
    const resistors = peers.map((p) => {
      const resistorId = p.source_component_id
      const component = index.components.get(resistorId)
      const placement = index.placement(resistorId)
      const nets = index.twoTerminalNets(resistorId)
      if (
        component?.ftype !== "simple_resistor" ||
        !Number.isFinite(component.resistance) ||
        component.resistance <= 0 ||
        !placement ||
        !nets ||
        !index.sameLocalScope(mosfet, placement) ||
        index.portsByComponent.get(resistorId)!.some((port) => {
          const pin = index.port(port)
          return (
            port.do_not_connect ||
            !pin ||
            pin.schematic_sheet_id !== mosfet.schematicSheetId
          )
        })
      )
        return
      return { placement, otherNet: nets.find((net) => net !== gateNet)! }
    })
    if (resistors.some((r) => !r)) return
    const shunts = resistors.filter((r) => r!.otherNet === sourceNet)
    const series = resistors.filter((r) => r!.otherNet !== sourceNet)
    if (shunts.length !== 1 || series.length !== 1) return
    const gateSourceResistor = shunts[0]!.placement
    const seriesGateResistor = series[0]!.placement
    if (series[0]!.otherNet === drainNet || index.isRail(series[0]!.otherNet))
      return

    // Restrict this advisory to clear separation: allow six schematic units
    // for labels/driver branches, or three body dimensions for larger symbols.
    // This is a readability heuristic, not a physical-layout spacing limit.
    const maxRecommendedBodyGap = Math.max(
      6,
      3 * Math.max(mosfet.width, mosfet.height),
    )
    const maxBodyGap = Math.max(
      bodyGap(mosfet, seriesGateResistor),
      bodyGap(mosfet, gateSourceResistor),
    )
    if (maxBodyGap <= maxRecommendedBodyGap) return
    this.params.issues.push({
      lineItemType: "MosfetGateNetworkNotGrouped",
      mosfetSchematicBox: mosfet,
      seriesGateResistorSchematicBox: seriesGateResistor,
      gateSourceResistorSchematicBox: gateSourceResistor,
      maxBodyGap,
      maxRecommendedBodyGap,
      message: `Group ${seriesGateResistor.sourceComponentName || "component"} and ${gateSourceResistor.sourceComponentName || "component"} beside ${mosfet.sourceComponentName || "component"}'s gate/source pins so the gate-drive branch can be read together. Preserve all pin connections, leave room for labels, and reroute affected traces.`,
    })
  }

  private mosfetPorts(id: string) {
    const type = this.index.components.get(id)?.ftype
    if (type !== "simple_mosfet" && type !== "simple_chip") return
    const ports = this.index.portsByComponent.get(id) ?? []
    const gate = ports.filter((p) => hasRole(p, /^(G|GATE)$/))
    const sources = ports.filter((p) => hasRole(p, /^(S|SOURCE)[0-9]*$/))
    const drains = ports.filter((p) => hasRole(p, /^(D|DRAIN)[0-9]*$/))
    // Imported power packages may expose several bonded source/drain pins.
    // Require every port to have exactly one role; never guess from pin numbers.
    if (
      gate.length !== 1 ||
      !sources.length ||
      !drains.length ||
      gate.length + sources.length + drains.length !== ports.length ||
      new Set([...gate, ...sources, ...drains]).size !== ports.length ||
      ports.some((p) => p.do_not_connect)
    )
      return
    for (const group of [sources, drains])
      if (
        new Set(group.map((p) => this.index.connected(p.source_port_id)))
          .size !== 1
      )
        return
    return { gate: gate[0]!, sources, drains }
  }

  static issueToString(issue: MosfetGateNetworkNotGrouped): string {
    const attrs: string[] = []
    addAttr(attrs, "mosfetName", issue.mosfetSchematicBox.sourceComponentName)
    addAttr(
      attrs,
      "seriesGateResistorName",
      issue.seriesGateResistorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "gateSourceResistorName",
      issue.gateSourceResistorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "maxBodyGap", issue.maxBodyGap)
    addAttr(attrs, "maxRecommendedBodyGap", issue.maxRecommendedBodyGap)
    addAttr(attrs, "message", issue.message)
    return `<MosfetGateNetworkNotGrouped ${attrs.join(" ")} />`
  }
}

function hasRole(port: SourcePort, pattern: RegExp): boolean {
  return [port.name, ...(port.port_hints ?? [])].some((hint) =>
    pattern.test(hint.toUpperCase().replace(/[\s_]/g, "")),
  )
}

function bodyGap(a: SchematicBoxPlacement, b: SchematicBoxPlacement): number {
  return Math.hypot(
    Math.max(0, Math.abs(a.schX - b.schX) - (a.width + b.width) / 2),
    Math.max(0, Math.abs(a.schY - b.schY) - (a.height + b.height) / 2),
  )
}
