import { BaseSolver } from "@tscircuit/solver-utils"
import type { SourcePort } from "circuit-json"
import type {
  InductorSeparatedFromChipPins,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

/** An inductor connected privately to two pins on the same side of one chip. */
export class ChipPinPairInductorPlacementSolver extends BaseSolver {
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
    for (const element of params.ctx.circuitJson)
      if (element.type === "pcb_component" && element.do_not_place)
        this.unpopulated.add(element.source_component_id)
    this.inductorIds = [...this.index.components.values()]
      .filter((c) => c.ftype === "simple_inductor")
      .map((c) => c.source_component_id)
    this.solved = this.inductorIds.length === 0
  }

  override _step(): void {
    const inductorId = this.inductorIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.inductorIds.length
    if (!inductorId || this.unpopulated.has(inductorId)) return
    const index = this.index
    const inductor = index.placement(inductorId)
    const nets = index.twoTerminalNets(inductorId)
    const inductorPorts = index.portsByComponent.get(inductorId) ?? []
    if (
      !inductor ||
      !nets ||
      nets.some((n) => index.isRail(n)) ||
      inductorPorts.some((p) => p.do_not_connect || hasSupplyRole(p))
    )
      return
    const peers = nets.map((net) => {
      const members = index.portsByNet.get(net) ?? []
      return members.length === 2
        ? members.find((p) => p.source_component_id !== inductorId)
        : undefined
    })
    const [first, second] = peers
    if (
      !first ||
      !second ||
      first.source_component_id !== second.source_component_id ||
      [first, second].some((p) => p.do_not_connect || hasSupplyRole(p))
    )
      return
    const hostId = first.source_component_id
    const host = index.placement(hostId)
    if (
      index.components.get(hostId)?.ftype !== "simple_chip" ||
      (index.portsByComponent.get(hostId)?.length ?? 0) < 3 ||
      this.unpopulated.has(hostId) ||
      !host ||
      !index.sameLocalScope(host, inductor)
    )
      return
    const chipPins = [index.port(first), index.port(second)]
    // twoTerminalNets preserves the source-port order, so each pair below is electrically connected.
    const inductorPins = inductorPorts.map((p) => index.port(p))
    if (
      [...chipPins, ...inductorPins].some(
        (p) =>
          !p ||
          p.schematic_sheet_id !== host.schematicSheetId ||
          ![p.center.x, p.center.y].every(Number.isFinite),
      ) ||
      [host, inductor].some(
        (b) =>
          ![b.schX, b.schY, b.width, b.height].every(Number.isFinite) ||
          b.width <= 0 ||
          b.height <= 0,
      )
    )
      return
    if (
      Math.abs(host.schX - inductor.schX) < (host.width + inductor.width) / 2 &&
      Math.abs(host.schY - inductor.schY) < (host.height + inductor.height) / 2
    )
      return
    const a = chipPins[0]!,
      b = chipPins[1]!
    const side = a.facing_direction
    if (!side || side !== b.facing_direction) return
    const pinSpan = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y)
    if (pinSpan < 0.01) return
    const maxPinDistance = Math.max(
      ...chipPins.map((p, n) =>
        Math.hypot(
          p!.center.x - inductorPins[n]!.center.x,
          p!.center.y - inductorPins[n]!.center.y,
        ),
      ),
    )
    // A schematic readability allowance for the symbol and labels, not an electrical
    // or PCB constraint. This rule does not infer a converter or switching-pin role.
    const maxRecommendedPinDistance = Math.max(
      3,
      2 * Math.max(inductor.width, inductor.height),
      2 * pinSpan,
    )
    if (maxPinDistance <= maxRecommendedPinDistance) return
    this.params.issues.push({
      lineItemType: "InductorSeparatedFromChipPins",
      hostSchematicBox: host,
      inductorSchematicBox: inductor,
      chipSourcePortIds: [first.source_port_id, second.source_port_id],
      maxPinDistance,
      maxRecommendedPinDistance,
      message: `Place ${inductor.sourceComponentName || "inductor"} beside its two connected pins on the ${side} side of ${host.sourceComponentName || "chip"} so the connections can be read together. Preserve pin connections, leave room for labels, and reroute affected traces; exact alignment is not required.`,
    })
  }

  static issueToString(issue: InductorSeparatedFromChipPins): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "hostComponentName",
      issue.hostSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "inductorName",
      issue.inductorSchematicBox.sourceComponentName,
    )
    addAttr(attrs, "maxPinDistance", issue.maxPinDistance)
    addAttr(attrs, "maxRecommendedPinDistance", issue.maxRecommendedPinDistance)
    addAttr(attrs, "message", issue.message)
    return `<InductorSeparatedFromChipPins ${attrs.join(" ")} />`
  }
}

function hasSupplyRole(port: SourcePort): boolean {
  return Boolean(
    port.requires_power ||
      port.provides_power ||
      port.requires_ground ||
      port.provides_ground ||
      port.requires_voltage !== undefined ||
      port.provides_voltage !== undefined,
  )
}
