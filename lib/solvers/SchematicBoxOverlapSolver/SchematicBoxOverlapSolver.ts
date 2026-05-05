import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  ComponentOverlap,
  OverlapCorrectionSuggestion,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../../types"
import type { SolverContext } from "../SolverContext"
import { addAttr } from "../../utils/format"

interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export class SchematicBoxOverlapSolver extends BaseSolver {
  private readonly placements: SchematicBoxPlacement[]
  private firstIndex = 0
  private secondIndex = 1

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    this.placements = params.ctx.componentPlacements
    this.solved = this.placements.length < 2
  }

  override _step(): void {
    if (this.firstIndex >= this.placements.length - 1) {
      this.solved = true
      return
    }

    const overlap = this.getComponentOverlap(
      this.placements[this.firstIndex]!,
      this.placements[this.secondIndex]!,
    )
    if (overlap) this.params.issues.push(overlap)

    this.secondIndex++
    if (this.secondIndex >= this.placements.length) {
      this.firstIndex++
      this.secondIndex = this.firstIndex + 1
    }

    this.solved = this.firstIndex >= this.placements.length - 1
  }

  private getCenteredRectBounds(box: SchematicBoxPlacement): RectBounds {
    return {
      left: box.schX - box.width / 2,
      right: box.schX + box.width / 2,
      top: box.schY - box.height / 2,
      bottom: box.schY + box.height / 2,
    }
  }

  private getOverlapCorrectionSuggestions({
    firstComponent,
    secondComponent,
    overlapWidth,
    overlapHeight,
  }: {
    firstComponent: SchematicBoxPlacement
    secondComponent: SchematicBoxPlacement
    overlapWidth: number
    overlapHeight: number
  }): OverlapCorrectionSuggestion[] {
    const firstArea = firstComponent.width * firstComponent.height
    const secondArea = secondComponent.width * secondComponent.height
    const target = firstArea <= secondArea ? firstComponent : secondComponent
    const other = target === firstComponent ? secondComponent : firstComponent
    const deltaSchX = target.schX <= other.schX ? -overlapWidth : overlapWidth
    const deltaSchY = target.schY <= other.schY ? -overlapHeight : overlapHeight
    return [
      {
        targetComponentName: target.sourceComponentName,
        deltaSchX,
        deltaSchY: 0,
        newSchX: target.schX + deltaSchX,
        newSchY: target.schY,
      },
      {
        targetComponentName: target.sourceComponentName,
        deltaSchX: 0,
        deltaSchY,
        newSchX: target.schX,
        newSchY: target.schY + deltaSchY,
      },
    ]
  }

  static issueToString(issue: ComponentOverlap): string {
    const attrs: string[] = []
    addAttr(attrs, "component1Name", issue.firstComponent.sourceComponentName)
    addAttr(attrs, "component2Name", issue.secondComponent.sourceComponentName)
    addAttr(attrs, "component1SchX", issue.firstComponent.schX)
    addAttr(attrs, "component1SchY", issue.firstComponent.schY)
    addAttr(attrs, "component2SchX", issue.secondComponent.schX)
    addAttr(attrs, "component2SchY", issue.secondComponent.schY)
    addAttr(attrs, "overlapWidth", issue.overlapWidth)
    addAttr(attrs, "overlapHeight", issue.overlapHeight)
    return [
      `<ComponentOverlap ${attrs.join(" ")}>`,
      ...issue.correctionSuggestions.map(
        SchematicBoxOverlapSolver.correctionSuggestionToString,
      ),
      "</ComponentOverlap>",
    ].join("\n")
  }

  private static correctionSuggestionToString(
    suggestion: OverlapCorrectionSuggestion,
  ): string {
    const attrs: string[] = []
    addAttr(attrs, "target", suggestion.targetComponentName)
    if (suggestion.deltaSchX !== 0) {
      addAttr(attrs, "newSchX", suggestion.newSchX)
      addAttr(attrs, "deltaSchX", suggestion.deltaSchX, { formatDelta: true })
    }
    if (suggestion.deltaSchY !== 0) {
      addAttr(attrs, "newSchY", suggestion.newSchY)
      addAttr(attrs, "deltaSchY", suggestion.deltaSchY, { formatDelta: true })
    }
    return `<OverlapCorrectionSuggestion ${attrs.join(" ")} />`
  }

  private getComponentOverlap(
    firstComponent: SchematicBoxPlacement,
    secondComponent: SchematicBoxPlacement,
  ): ComponentOverlap | null {
    const a = this.getCenteredRectBounds(firstComponent)
    const b = this.getCenteredRectBounds(secondComponent)
    const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

    if (overlapWidth <= 0 || overlapHeight <= 0) return null

    return {
      lineItemType: "ComponentOverlap",
      firstComponent,
      secondComponent,
      overlapWidth,
      overlapHeight,
      correctionSuggestions: this.getOverlapCorrectionSuggestions({
        firstComponent,
        secondComponent,
        overlapWidth,
        overlapHeight,
      }),
    }
  }
}
