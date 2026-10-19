import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicPort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxInnerLabelOutOfBounds,
  SchematicPlacementIssue,
  SchematicSide,
} from "../../types"
import { addAttr } from "../../utils/format"
import { getSchematicBoxComponentIds } from "../../utils/schematic-box-components"
import {
  getLabelMovementFactor,
  getSchematicBoxLabelRects,
  getSchematicPinLabelWidth,
  getSchematicPortsWithResolvedLabels,
  type LabelRect,
} from "../../utils/schematic-box-labels"
import type { SolverContext } from "../SolverContext"

const EPSILON = 1e-9
const SUGGESTED_EDGE_CLEARANCE = 0.1

/** Inner labels must stay inside their own box, independently of whether any
 * other label collides with them. Pin numbers and reference/value text are
 * outside labels and are deliberately excluded. */
export class SchematicBoxInnerLabelBoundsSolver extends BaseSolver {
  private readonly entries: Array<[SchematicBoxPlacement, SchematicPort[]]>
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const boxIds = getSchematicBoxComponentIds(params.ctx.circuitJson)
    const portsByComponent = new Map<string, SchematicPort[]>()
    for (const element of getSchematicPortsWithResolvedLabels(
      params.ctx.circuitJson,
    )) {
      const id = element.schematic_component_id
      if (!id) continue
      const ports = portsByComponent.get(id) ?? []
      ports.push(element)
      portsByComponent.set(id, ports)
    }
    this.entries = params.ctx.componentPlacements.flatMap((box) =>
      box.schematicComponentId && boxIds.has(box.schematicComponentId)
        ? [
            [box, portsByComponent.get(box.schematicComponentId) ?? []] as [
              SchematicBoxPlacement,
              SchematicPort[],
            ],
          ]
        : [],
    )
    this.solved = this.entries.length === 0
  }

  override _step(): void {
    const entry = this.entries[this.currentIndex++]
    this.solved = this.currentIndex >= this.entries.length
    if (!entry) return
    const [box, ports] = entry
    const rects = getSchematicBoxLabelRects(
      box,
      ports,
      getSchematicPinLabelWidth,
    )
    const overflowingLabels = rects.flatMap((rect) => {
      const outsideEdges = this.getEdgeOverflows(box, rect)
        .filter(([, overflow]) => overflow > EPSILON)
        .map(([edge]) => edge)
      return outsideEdges.length
        ? [
            {
              schematicPortId: rect.schematicPortId,
              text: rect.text,
              side: rect.side,
              bounds: {
                left: rect.xMin,
                right: rect.xMax,
                bottom: rect.yMin,
                top: rect.yMax,
              },
              outsideEdges,
            },
          ]
        : []
    })
    if (!overflowingLabels.length) return
    const dimensions = this.getSuggestedDimensions(box, rects)
    this.params.issues.push({
      lineItemType: "SchematicBoxInnerLabelOutOfBounds",
      schematicBox: box,
      overflowingLabels,
      ...dimensions,
      message: `Inner pin labels extend outside the schematic box. Increase ${dimensions.suggestedSchWidth && dimensions.suggestedSchHeight ? "schWidth and schHeight" : dimensions.suggestedSchWidth ? "schWidth" : "schHeight"} to contain the labels with ${SUGGESTED_EDGE_CLEARANCE} schematic units of edge clearance.`,
    })
  }

  private getEdgeOverflows(
    box: SchematicBoxPlacement,
    rect: LabelRect,
  ): Array<[SchematicSide, number]> {
    return [
      ["left", box.schX - box.width / 2 - rect.xMin],
      ["right", rect.xMax - (box.schX + box.width / 2)],
      ["bottom", box.schY - box.height / 2 - rect.yMin],
      ["top", rect.yMax - (box.schY + box.height / 2)],
    ]
  }

  private getSuggestedDimensions(
    box: SchematicBoxPlacement,
    rects: LabelRect[],
  ) {
    const growth = { width: 0, height: 0 }
    for (const rect of rects) {
      for (const [edge, overflow] of this.getEdgeOverflows(box, rect)) {
        const dimension =
          edge === "left" || edge === "right" ? "width" : "height"
        const direction = edge === "left" || edge === "bottom" ? -1 : 1
        // Labels follow their pin bank's edge when that axis expands. Labels
        // along perpendicular edges keep their coordinate on this axis.
        const rate =
          0.5 - direction * getLabelMovementFactor(rect.side, dimension)
        if (rate <= 0) continue
        growth[dimension] = Math.max(
          growth[dimension],
          (overflow + SUGGESTED_EDGE_CLEARANCE) / rate,
        )
      }
    }
    const rounded = (size: number, delta: number) =>
      delta > EPSILON
        ? Math.ceil((size + delta) * 1000 - EPSILON) / 1000
        : undefined
    return {
      suggestedSchWidth: rounded(box.width, growth.width),
      suggestedSchHeight: rounded(box.height, growth.height),
    }
  }

  static issueToString(issue: SchematicBoxInnerLabelOutOfBounds): string {
    const attrs: string[] = []
    addAttr(attrs, "message", issue.message)
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "currentSchWidth", issue.schematicBox.width)
    addAttr(attrs, "currentSchHeight", issue.schematicBox.height)
    addAttr(attrs, "suggestedSchWidth", issue.suggestedSchWidth)
    addAttr(attrs, "suggestedSchHeight", issue.suggestedSchHeight)
    const labels = issue.overflowingLabels.map((label) => {
      const details: string[] = []
      addAttr(details, "text", label.text)
      addAttr(details, "port", label.schematicPortId)
      addAttr(details, "side", label.side)
      addAttr(details, "outsideEdges", label.outsideEdges.join(","))
      return `  <PinLabel ${details.join(" ")} />`
    })
    return `<SchematicBoxInnerLabelOutOfBounds ${attrs.join(" ")}>\n${labels.join("\n")}\n</SchematicBoxInnerLabelOutOfBounds>`
  }
}
