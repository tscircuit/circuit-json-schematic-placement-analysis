import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  FeedbackNetworkNotCompact,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import { addAttr } from "../../utils/format"
import { PlacementNetworkIndex } from "../../utils/placement-network-index"
import type { SolverContext } from "../SolverContext"

export class FeedbackNetworkPlacementSolver extends BaseSolver {
  // A readability heuristic in schematic units, not a PCB proximity constraint.
  private static readonly MIN_BODY_GAP = 4
  private readonly index: PlacementNetworkIndex
  private readonly amplifierIds: string[]
  private readonly issues: SchematicPlacementIssue[]
  private currentIndex = 0

  constructor({
    ctx,
    issues,
  }: { ctx: SolverContext; issues: SchematicPlacementIssue[] }) {
    super()
    this.issues = issues
    this.index = new PlacementNetworkIndex(ctx)
    this.amplifierIds = [...this.index.components.values()]
      .filter((component) => component.ftype === "simple_op_amp")
      .map((component) => component.source_component_id)
    this.solved = this.amplifierIds.length === 0
  }

  override _step(): void {
    const id = this.amplifierIds[this.currentIndex++]
    this.solved = this.currentIndex >= this.amplifierIds.length
    if (!id) return
    const index = this.index
    const amplifier = index.placement(id)
    const output = index.namedPort(id, "output")
    const input = index.namedPort(id, "inverting_input")
    if (
      !amplifier ||
      !output ||
      !input ||
      !index.port(output) ||
      !index.port(input)
    )
      return
    const outputNet = index.connected(output.source_port_id)
    const inputNet = index.connected(input.source_port_id)
    if (
      outputNet === inputNet ||
      index.isRail(outputNet) ||
      index.isRail(inputNet)
    )
      return

    // Shared summing nodes can belong to a larger stage; do not assign them to one amplifier.
    if (
      (index.portsByNet.get(inputNet) ?? []).some(
        (port) =>
          port.source_component_id !== id &&
          index.components.get(port.source_component_id)?.ftype ===
            "simple_op_amp",
      )
    )
      return

    const feedbackComponents: SchematicBoxPlacement[] = []
    const seen = new Set<string>()
    for (const port of index.portsByNet.get(outputNet) ?? []) {
      const componentId = port.source_component_id
      if (seen.has(componentId)) continue
      seen.add(componentId)
      const component = index.components.get(componentId)
      if (
        component?.ftype !== "simple_resistor" &&
        component?.ftype !== "simple_capacitor"
      )
        continue
      if (component.ftype === "simple_resistor" && !(component.resistance > 0))
        continue
      const nets = index.twoTerminalNets(componentId)
      if (!nets?.includes(inputNet) || !nets.includes(outputNet)) continue
      const placement = index.placement(componentId)
      // An explicitly separated feedback block is outside this local heuristic.
      if (!placement || !index.sameLocalScope(amplifier, placement)) return
      feedbackComponents.push(placement)
    }
    const distantComponents = feedbackComponents.flatMap((schematicBox) => {
      const bodyGap = distanceBetweenBoxes(amplifier, schematicBox)
      const maxRecommendedBodyGap = Math.max(
        FeedbackNetworkPlacementSolver.MIN_BODY_GAP,
        3 * Math.max(schematicBox.width, schematicBox.height),
      )
      return bodyGap > maxRecommendedBodyGap
        ? [{ schematicBox, bodyGap, maxRecommendedBodyGap }]
        : []
    })
    if (distantComponents.length === 0) return
    const names = distantComponents
      .map(
        ({ schematicBox }) =>
          schematicBox.sourceComponentName ?? schematicBox.sourceComponentId,
      )
      .join(", ")
    this.issues.push({
      lineItemType: "FeedbackNetworkNotCompact",
      amplifierSchematicBox: amplifier,
      feedbackComponents,
      distantComponents,
      outputSourcePortId: output.source_port_id,
      invertingInputSourcePortId: input.source_port_id,
      message: `consider grouping ${names} closer to ${amplifier.sourceComponentName ?? id}, with a compact feedback return path above or below the amplifier`,
    })
  }

  static issueToString(issue: FeedbackNetworkNotCompact): string {
    const attrs: string[] = []
    addAttr(
      attrs,
      "amplifierName",
      issue.amplifierSchematicBox.sourceComponentName,
    )
    addAttr(
      attrs,
      "feedbackComponentNames",
      issue.feedbackComponents
        .map((box) => box.sourceComponentName ?? box.sourceComponentId)
        .join(", "),
    )
    addAttr(
      attrs,
      "distantComponentNames",
      issue.distantComponents
        .map(
          ({ schematicBox }) =>
            schematicBox.sourceComponentName ?? schematicBox.sourceComponentId,
        )
        .join(", "),
    )
    addAttr(attrs, "message", issue.message)
    return `<FeedbackNetworkNotCompact ${attrs.join(" ")} />`
  }
}

function distanceBetweenBoxes(
  a: SchematicBoxPlacement,
  b: SchematicBoxPlacement,
): number {
  return Math.hypot(
    Math.max(0, Math.abs(a.schX - b.schX) - (a.width + b.width) / 2),
    Math.max(0, Math.abs(a.schY - b.schY) - (a.height + b.height) / 2),
  )
}
