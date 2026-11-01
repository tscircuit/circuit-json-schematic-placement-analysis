import {
  getSchematicBoxLabelRects,
  getSchematicPinLabelWidth,
  getSchematicPortsWithResolvedLabels,
  MINIMUM_LABEL_BANK_GAP,
  schematicLabelRectsOverlap,
  type LabelRect,
} from "../../utils/schematic-box-labels"
import { getSchematicBoxComponentIds } from "../../utils/schematic-box-components"
import { getSchematicBoxLabelExpansion } from "../../utils/schematic-box-label-expansion"
import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson, SchematicPort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxInnerLabelCollision,
  SchematicPlacementIssue,
  SchematicSide,
  SchematicPinLabelBounds,
  SchematicPinLabelCollisionPair,
} from "../../types"
import { addAttr } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

interface CollisionSummary {
  overlappingSides: SchematicSide[]
  labelPairs: SchematicPinLabelCollisionPair[]
}

export class SchematicBoxInnerLabelCollisionSolver extends BaseSolver {
  private entries: Array<[string, SchematicPort[]]>
  private readonly placementById: Map<string, SchematicBoxPlacement>
  private currentIndex = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const { circuitJson, componentPlacements } = params.ctx
    this.placementById =
      this.getPlacementBySchematicComponentId(componentPlacements)
    const boxIds = getSchematicBoxComponentIds(circuitJson)
    this.entries = Array.from(
      this.getPortsBySchematicComponentId(circuitJson),
    ).filter(([id]) => boxIds.has(id))
    this.solved = this.entries.length === 0
  }

  override _step(): void {
    const entry = this.entries[this.currentIndex++]
    if (!entry) {
      this.solved = true
      return
    }
    this.solved = this.currentIndex >= this.entries.length

    const [schematicComponentId, ports] = entry
    const schematicBox = this.placementById.get(schematicComponentId)
    if (!schematicBox) return

    // Match the renderer's displayed text and font size. Glyph widths matter
    // even when opposing banks are staggered by half a pin.
    const labelRects = getSchematicBoxLabelRects(
      schematicBox,
      ports,
      getSchematicPinLabelWidth,
    )
    if (labelRects.length === 0) return

    const collisionSummary = this.getCollisionSummary(labelRects)
    if (collisionSummary.overlappingSides.length === 0) return
    const expansion = getSchematicBoxLabelExpansion(schematicBox, labelRects)

    this.params.issues.push({
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox,
      overlappingSides: collisionSummary.overlappingSides,
      minimumLabelGap: MINIMUM_LABEL_BANK_GAP,
      labelPairs: collisionSummary.labelPairs,
      suggestedSchWidth: expansion?.width,
      suggestedSchHeight: expansion?.height,
      message: this.getMessage(collisionSummary, expansion),
    })
  }

  static issueToString(issue: SchematicBoxInnerLabelCollision): string {
    const attrs: string[] = []
    addAttr(attrs, "message", issue.message)
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "currentSchWidth", issue.schematicBox.width)
    addAttr(attrs, "currentSchHeight", issue.schematicBox.height)
    addAttr(attrs, "overlappingSides", issue.overlappingSides.join(","))
    addAttr(attrs, "minimumLabelGap", issue.minimumLabelGap)
    addAttr(attrs, "suggestedSchWidth", issue.suggestedSchWidth)
    addAttr(attrs, "suggestedSchHeight", issue.suggestedSchHeight)
    const opening = `<SchematicBoxInnerLabelCollision ${attrs.join(" ")}`
    if (!issue.labelPairs?.length) return `${opening} />`
    const pairs = issue.labelPairs.map((pair) => {
      const pairAttrs: string[] = []
      addAttr(pairAttrs, "label1", pair.firstLabel.text)
      addAttr(pairAttrs, "label2", pair.secondLabel.text)
      addAttr(pairAttrs, "port1", pair.firstLabel.schematicPortId)
      addAttr(pairAttrs, "port2", pair.secondLabel.schematicPortId)
      addAttr(pairAttrs, "side1", pair.firstLabel.side)
      addAttr(pairAttrs, "side2", pair.secondLabel.side)
      addAttr(pairAttrs, "kind", pair.kind)
      addAttr(pairAttrs, "measuredGap", pair.measuredGap)
      return `  <PinLabelPair ${pairAttrs.join(" ")} />`
    })
    return `${opening}>\n${pairs.join("\n")}\n</SchematicBoxInnerLabelCollision>`
  }

  private getMessage(
    { overlappingSides: sides, labelPairs }: CollisionSummary,
    expansion?: { width?: number; height?: number },
  ): string {
    const dimension =
      expansion?.width && expansion.height
        ? "schWidth and schHeight"
        : expansion?.width
          ? "schWidth"
          : expansion?.height
            ? "schHeight"
            : sides.every((side) => side === "left" || side === "right")
              ? "schWidth"
              : sides.every((side) => side === "top" || side === "bottom")
                ? "schHeight"
                : "schWidth or schHeight"
    const conflicts = labelPairs
      .map(
        ({ firstLabel: a, secondLabel: b, kind }) =>
          `Labels ${a.text} (${a.side}) and ${b.text} (${b.side}) ${kind === "overlap" ? "overlap" : "are too close"}.`,
      )
      .join(" ")
    return `${conflicts} Increase the ${dimension} to leave at least ${MINIMUM_LABEL_BANK_GAP} schematic units between these labels.`
  }

  private isSchematicSide(
    side: SchematicPort["side_of_component"],
  ): side is SchematicSide {
    return (
      side === "left" || side === "right" || side === "top" || side === "bottom"
    )
  }

  private getPlacementBySchematicComponentId(
    componentPlacements: SchematicBoxPlacement[],
  ): Map<string, SchematicBoxPlacement> {
    return new Map(
      componentPlacements
        .filter((p) => p.schematicComponentId)
        .map((p) => [p.schematicComponentId!, p]),
    )
  }

  private getPortsBySchematicComponentId(
    circuitJson: CircuitJson,
  ): Map<string, SchematicPort[]> {
    const map = new Map<string, SchematicPort[]>()
    for (const port of getSchematicPortsWithResolvedLabels(circuitJson)) {
      if (!port.schematic_component_id) continue
      if (!this.isSchematicSide(port.side_of_component)) continue
      const ports = map.get(port.schematic_component_id)
      if (ports) ports.push(port)
      else map.set(port.schematic_component_id, [port])
    }
    return map
  }

  private getCollisionSummary(rects: LabelRect[]): CollisionSummary {
    const overlappingSides = new Set<SchematicSide>()
    const labelPairs: SchematicPinLabelCollisionPair[] = []
    const label = (rect: LabelRect): SchematicPinLabelBounds => ({
      schematicPortId: rect.schematicPortId,
      text: rect.text,
      side: rect.side,
      bounds: {
        left: rect.xMin,
        right: rect.xMax,
        bottom: rect.yMin,
        top: rect.yMax,
      },
    })

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!
        const b = rects[j]!
        if (a.side === b.side) continue

        if (!schematicLabelRectsOverlap(a, b, MINIMUM_LABEL_BANK_GAP)) continue

        overlappingSides.add(a.side)
        overlappingSides.add(b.side)
        labelPairs.push({
          firstLabel: label(a),
          secondLabel: label(b),
          measuredGap: Math.max(
            0,
            a.xMin - b.xMax,
            b.xMin - a.xMax,
            a.yMin - b.yMax,
            b.yMin - a.yMax,
          ),
          kind: schematicLabelRectsOverlap(a, b, 0) ? "overlap" : "clearance",
        })
      }
    }

    return {
      overlappingSides: this.sortSides(Array.from(overlappingSides)),
      labelPairs,
    }
  }

  private sortSides(sides: SchematicSide[]): SchematicSide[] {
    const order: Record<SchematicSide, number> = {
      left: 0,
      right: 1,
      top: 2,
      bottom: 3,
    }
    return sides.sort((a, b) => order[a] - order[b])
  }
}
