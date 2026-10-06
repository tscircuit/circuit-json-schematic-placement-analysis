import {
  getSchematicBoxLabelRects,
  schematicLabelRectsOverlap,
  type LabelRect,
} from "../../utils/schematic-box-labels"
import { getSchematicBoxComponentIds } from "../../utils/schematic-box-components"
import { getSchematicTextWidth } from "../../utils/schematic-text-geometry"
import { BaseSolver } from "@tscircuit/solver-utils"
import type { CircuitJson, SchematicPort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxInnerLabelCollision,
  SchematicPlacementIssue,
  SchematicSide,
} from "../../types"
import { addAttr } from "../../utils/format"
import type { SolverContext } from "../SolverContext"

interface CollisionSummary {
  overlappingSides: SchematicSide[]
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

    // Box labels use the renderer's default 0.15-unit sans-serif font.
    // Glyph widths matter even when opposing banks are staggered by half a pin.
    const labelRects = getSchematicBoxLabelRects(schematicBox, ports, (port) =>
      getSchematicTextWidth(port.display_pin_label!, 0.15),
    )
    if (labelRects.length === 0) return

    const collisionSummary = this.getCollisionSummary(labelRects)
    if (collisionSummary.overlappingSides.length === 0) return

    this.params.issues.push({
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox,
      overlappingSides: collisionSummary.overlappingSides,
      message: this.getMessage(collisionSummary.overlappingSides),
    })
  }

  static issueToString(issue: SchematicBoxInnerLabelCollision): string {
    const attrs: string[] = []
    addAttr(attrs, "message", issue.message)
    addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
    addAttr(attrs, "currentSchWidth", issue.schematicBox.width)
    addAttr(attrs, "currentSchHeight", issue.schematicBox.height)
    addAttr(attrs, "overlappingSides", issue.overlappingSides.join(","))
    return `<SchematicBoxInnerLabelCollision ${attrs.join(" ")} />`
  }

  private getMessage(sides: SchematicSide[]): string {
    const dimension = sides.every((side) => side === "left" || side === "right")
      ? "schWidth"
      : sides.every((side) => side === "top" || side === "bottom")
        ? "schHeight"
        : "schWidth or schHeight"
    return `Inner labels are colliding. Increase the ${dimension}.`
  }

  private isSchematicPort(el: CircuitJson[number]): el is SchematicPort {
    return el.type === "schematic_port"
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
    for (const port of circuitJson.filter((el) => this.isSchematicPort(el))) {
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

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!
        const b = rects[j]!
        if (a.side === b.side) continue

        if (!schematicLabelRectsOverlap(a, b)) continue

        overlappingSides.add(a.side)
        overlappingSides.add(b.side)
      }
    }

    return {
      overlappingSides: this.sortSides(Array.from(overlappingSides)),
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
