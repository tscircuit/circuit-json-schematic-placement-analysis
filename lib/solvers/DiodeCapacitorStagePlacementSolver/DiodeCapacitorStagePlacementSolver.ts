import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  DiodeCapacitorJunctionTooSpreadOut,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** Keep the shared junction of a local diode-capacitor stage readable. */
export class DiodeCapacitorStagePlacementSolver extends BaseSolver {
  private readonly index: PlacementNetworkIndex
  private readonly nets: string[]
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
    for (const e of params.ctx.circuitJson) {
      if (e.type === "pcb_component" && e.do_not_place)
        this.unpopulated.add(e.source_component_id)
      if (e.type === "source_port") {
        const net = this.index.connected(e.source_port_id)
        if (e.requires_ground || e.provides_ground)
          this.index.groundNets.add(net)
        if (e.requires_power || e.provides_power) this.index.powerNets.add(net)
      }
    }
    this.nets = [...this.index.portsByNet.keys()]
    this.solved = this.nets.length === 0
  }

  override _step(): void {
    const net = this.nets[this.currentIndex++]
    this.solved = this.currentIndex >= this.nets.length
    if (!net || this.index.isRail(net)) return
    const index = this.index
    const junction = index.portsByNet.get(net)!
    // Extra branches, shorted parts and ambiguous symbol instances need a broader policy.
    if (
      junction.length !== 3 ||
      new Set(junction.map((p) => p.source_component_id)).size !== 3
    )
      return
    const parts = junction.map((p) => this.localPart(p.source_component_id))
    if (parts.some((p) => !p)) return
    const diodes = parts.filter((p) => p!.component.ftype === "simple_diode")
    const capacitors = parts.filter(
      (p) => p!.component.ftype === "simple_capacitor",
    )
    if (diodes.length !== 2 || capacitors.length !== 1) return
    const capacitor = capacitors[0]!
    const first = diodes[0]!
    const second = diodes[1]!
    if (
      ![first, second].every((p) =>
        index.sameLocalScope(capacitor.placement, p.placement),
      )
    )
      return
    const otherNet = (part: typeof capacitor) =>
      part.nets.find((n) => n !== net)!
    const diodeNets = [otherNet(first), otherNet(second)]
    const grounds = diodeNets.filter((n) => index.groundNets.has(n))
    if (grounds.length !== 1) return
    const ground = grounds[0]!
    const branchNet = diodeNets.find((n) => n !== ground)!
    const capacitorNet = otherNet(capacitor)
    if (
      capacitorNet === branchNet ||
      capacitorNet === ground ||
      index.isRail(capacitorNet)
    )
      return
    // Establish the second diode's grounded capacitor branch from topology alone.
    const bankIds = new Set(
      (index.portsByNet.get(branchNet) ?? [])
        .filter(
          (p) =>
            index.components.get(p.source_component_id)?.ftype ===
            "simple_capacitor",
        )
        .map((p) => p.source_component_id),
    )
    const groundedBank = [...bankIds].filter((id) =>
      index.twoTerminalNets(id)?.includes(ground),
    )
    if (
      !groundedBank.length ||
      groundedBank.some((id) => {
        const part = this.localPart(id)
        return (
          !part || !index.sameLocalScope(capacitor.placement, part.placement)
        )
      })
    )
      return

    const placements = [capacitor.placement, first.placement, second.placement]
    const pins = junction.map((p) => index.port(p)!)
    const maxJunctionPinDistance = Math.max(
      ...pins.flatMap((a, i) =>
        pins
          .slice(i + 1)
          .map((b) =>
            Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y),
          ),
      ),
    )
    // Schematic readability allowance, scaled for symbol size; not a PCB distance limit.
    const maxRecommendedJunctionPinDistance = Math.max(
      4,
      ...placements.map((p) => 3 * Math.max(p.width, p.height)),
    )
    if (maxJunctionPinDistance <= maxRecommendedJunctionPinDistance) return
    const names = placements.map((p) => p.sourceComponentName || "component")
    this.params.issues.push({
      lineItemType: "DiodeCapacitorJunctionTooSpreadOut",
      capacitorSchematicBox: capacitor.placement,
      diodeSchematicBoxes: [first.placement, second.placement],
      maxJunctionPinDistance,
      maxRecommendedJunctionPinDistance,
      message: `Bring ${names.join(", ")} closer together so their shared junction can be read as one local diode-capacitor stage. Preserve pin connections, leave room for labels, and reroute affected traces.`,
    })
  }

  private localPart(id: string) {
    const component = this.index.components.get(id)
    const placement = this.index.placement(id)
    const ports = this.index.portsByComponent.get(id)
    const nets = this.index.twoTerminalNets(id)
    if (
      !component ||
      !placement ||
      !nets ||
      this.unpopulated.has(id) ||
      ports?.length !== 2 ||
      ![placement.width, placement.height].every(
        (n) => Number.isFinite(n) && n > 0,
      ) ||
      (component.ftype === "simple_capacitor" &&
        (!Number.isFinite(component.capacitance) ||
          component.capacitance <= 0)) ||
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
    return { component, placement, ports, nets }
  }

  static issueToString(issue: DiodeCapacitorJunctionTooSpreadOut): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "capacitorName",
      issue.capacitorSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "diodeNames",
      issue.diodeSchematicBoxes.map((p) => p.sourceComponentName).join(","),
    )
    addAttr(attrs, "maxJunctionPinDistance", issue.maxJunctionPinDistance)
    addAttr(
      attrs,
      "maxRecommendedJunctionPinDistance",
      issue.maxRecommendedJunctionPinDistance,
    )
    addAttr(attrs, "message", issue.message)
    return `<DiodeCapacitorJunctionTooSpreadOut ${attrs.join(" ")} />`
  }
}
