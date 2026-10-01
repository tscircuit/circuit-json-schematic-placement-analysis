import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  PiFilterComponentsNotGrouped,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Group an unambiguous signal C–L–C pi filter without prescribing its orientation. */
export class PiFilterPlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly inductorIds: string[]
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
    // Some imports retain population information only on pcb_component records.
    // Without an explicit flag, all parallel capacitors remain candidates.
    for (const e of params.ctx.circuitJson)
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
    for (const e of params.ctx.circuitJson)
      if (e.type === "pcb_component" && !e.do_not_place)
        this.unpopulated.delete(e.source_component_id)
    this.inductorIds = [...this.index.components.values()]
      .filter(
        (c) =>
          c.ftype === "simple_inductor" &&
          !this.unpopulated.has(c.source_component_id),
      )
      .map((c) => c.source_component_id)
    this.solved = this.inductorIds.length === 0
  }

  override _step(): void {
    const id = this.inductorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.inductorIds.length
    if (!id) return
    const index = this.index
    const inductor = this.localPart(id)
    const nets = index.twoTerminalNets(id)
    if (!inductor || !nets || nets.some((net) => index.isRail(net))) return

    const branches = nets.map((net) => {
      const peers = index.portsByNet.get(net) ?? []
      // Cascaded filters and parallel series elements need a broader policy.
      if (
        peers.some(
          (p) =>
            p.source_component_id !== id &&
            !this.unpopulated.has(p.source_component_id) &&
            index.components.get(p.source_component_id)?.ftype ===
              "simple_inductor",
        )
      )
        return
      const capacitors = peers.filter((p) => {
        const c = index.components.get(p.source_component_id)
        const capNets = index.twoTerminalNets(p.source_component_id)
        return (
          c?.ftype === "simple_capacitor" &&
          !this.unpopulated.has(p.source_component_id) &&
          capNets?.some((n) => n !== net && index.groundNets.has(n))
        )
      })
      // Never guess which capacitor belongs to the filter in a populated bank.
      if (capacitors.length !== 1) return
      const capacitorPort = capacitors[0]!
      const component = index.components.get(capacitorPort.source_component_id)!
      if (
        component.ftype !== "simple_capacitor" ||
        !Number.isFinite(component.capacitance) ||
        component.capacitance <= 0
      )
        return
      const capacitor = this.localPart(capacitorPort.source_component_id)
      if (
        !capacitor ||
        !index.sameLocalScope(inductor.placement, capacitor.placement)
      )
        return
      const capPin = index.port(capacitorPort)!
      const seriesPin = index.port(
        inductor.ports.find((p) => index.connected(p.source_port_id) === net)!,
      )!
      return {
        placement: capacitor.placement,
        ground: index
          .twoTerminalNets(capacitorPort.source_component_id)!
          .find((n) => n !== net)!,
        distance: Math.hypot(
          capPin.center.x - seriesPin.center.x,
          capPin.center.y - seriesPin.center.y,
        ),
      }
    })
    const [first, second] = branches
    if (!first || !second || first.ground !== second.ground) return
    const placements = [inductor.placement, first.placement, second.placement]
    // Readability allowance for passive symbols and labels, not a PCB/RF limit.
    // Scale for larger symbols; do not require equal coordinates or exact spacing.
    const maxRecommendedSignalPinDistance = Math.max(
      4,
      ...placements.map((p) => 3 * Math.max(p.width, p.height)),
    )
    const maxSignalPinDistance = Math.max(first.distance, second.distance)
    if (maxSignalPinDistance <= maxRecommendedSignalPinDistance) return
    const name = (p: typeof inductor.placement) =>
      p.sourceComponentName ?? p.sourceComponentId
    this.params.issues.push({
      lineItemType: "PiFilterComponentsNotGrouped",
      inductorSchematicBox: inductor.placement,
      firstCapacitorSchematicBox: first.placement,
      secondCapacitorSchematicBox: second.placement,
      maxSignalPinDistance,
      maxRecommendedSignalPinDistance,
      message: `Group ${name(first.placement)} and ${name(second.placement)} beside the connected ends of ${name(inductor.placement)} so the series path and both grounded branches of the pi filter can be read together. Preserve pin connections, allow room for labels, and reroute affected traces.`,
    })
  }

  private localPart(id: string) {
    const placement = this.index.placement(id)
    const ports = this.index.portsByComponent.get(id)
    if (
      !placement ||
      ports?.length !== 2 ||
      ports.some((p) => {
        const pin = this.index.port(p)
        return (
          p.do_not_connect ||
          !pin ||
          pin.schematic_sheet_id !== placement.schematicSheetId ||
          !Number.isFinite(pin.center.x) ||
          !Number.isFinite(pin.center.y)
        )
      })
    )
      return
    return { placement, ports }
  }

  static issueToString(issue: PiFilterComponentsNotGrouped): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "inductorName",
      issue.inductorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "firstCapacitorName",
      issue.firstCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "secondCapacitorName",
      issue.secondCapacitorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "maxSignalPinDistance", issue.maxSignalPinDistance)
    addAttr(
      attrs,
      "maxRecommendedSignalPinDistance",
      issue.maxRecommendedSignalPinDistance,
    )
    addAttr(attrs, "message", issue.message)
    return `<PiFilterComponentsNotGrouped ${attrs.join(" ")} />`
  }
}
