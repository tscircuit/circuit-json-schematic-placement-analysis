import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicText } from "circuit-json"
import type {
  SchematicPlacementIssue,
  SchematicTextCollision,
  SchematicTextCollisionObject,
} from "../../types"
import { addAttr } from "../../utils/format"
import { centeredRect } from "../../utils/geometry"
import { getSchematicSheetNamesById } from "../../utils/schematic-sheets"
import {
  getSchematicTextPolygons,
  polygonBounds,
  polygonsOverlap,
  rectPolygon,
  traceSegmentPolygon,
  segmentCrossesPolygon,
  type Polygon,
  type Point,
} from "../../utils/schematic-text-geometry"
import type { SolverContext } from "../SolverContext"

interface Obstacle {
  object: SchematicTextCollisionObject
  polygons: Polygon[]
  sheetId?: string
  segments?: Array<{ from: Point; to: Point }>
}

interface TextGeometry extends Obstacle {
  text: SchematicText
}

export class SchematicTextClearanceSolver extends BaseSolver {
  private readonly texts: TextGeometry[]
  private readonly obstacles: Obstacle[]
  private readonly sheetNames: Map<string, string>
  private index = 0

  constructor(
    private readonly params: {
      ctx: SolverContext
      issues: SchematicPlacementIssue[]
    },
  ) {
    super()
    const { ctx } = params
    this.sheetNames = getSchematicSheetNamesById(ctx.circuitJson)
    const placementById = new Map(
      ctx.componentPlacements.map((p) => [p.schematicComponentId, p]),
    )
    const customSymbolIds = new Set(
      ctx.circuitJson.flatMap((element) =>
        element.type === "schematic_component" &&
        element.is_box_with_pins === false &&
        !element.symbol_name
          ? [element.schematic_component_id]
          : [],
      ),
    )
    const seenText = new Set<string>()
    this.texts = ctx.circuitJson.flatMap((element) => {
      if (element.type !== "schematic_text") return []
      // Symbol templates use local coordinates; only inspect sheet-space text.
      if (element.schematic_symbol_id && !element.schematic_component_id)
        return []
      const owner = element.schematic_component_id
        ? placementById.get(element.schematic_component_id)
        : undefined
      const polygons = getSchematicTextPolygons(element)
      if (!polygons.length) return []
      const sheetId = element.schematic_sheet_id ?? owner?.schematicSheetId
      // Some exports emit the same trace label twice. Identical overprinting
      // does not obscure another annotation and should not duplicate warnings.
      const fingerprint = JSON.stringify([
        sheetId,
        element.schematic_component_id,
        element.text,
        element.position.x,
        element.position.y,
        element.font_size,
        element.anchor,
        element.rotation,
        element.color,
      ])
      if (seenText.has(fingerprint)) return []
      seenText.add(fingerprint)
      return [
        {
          text: element,
          polygons,
          sheetId,
          object: {
            type: "text" as const,
            id: element.schematic_text_id,
            text: element.text,
            schematicComponentId: element.schematic_component_id,
          },
        },
      ]
    })
    this.obstacles = [
      ...ctx.componentPlacements.flatMap((p) =>
        // Custom path/circle symbols can have empty corners in their bounds.
        // Their ink geometry must be known before treating that area as a body.
        p.schematicComponentId && !customSymbolIds.has(p.schematicComponentId)
          ? [
              {
                object: {
                  type: "component" as const,
                  id: p.schematicComponentId,
                  componentName: p.sourceComponentName,
                  schematicComponentId: p.schematicComponentId,
                },
                polygons: [
                  rectPolygon(centeredRect(p.schX, p.schY, p.width, p.height)),
                ],
                sheetId: p.schematicSheetId,
              },
            ]
          : [],
      ),
      ...ctx.circuitJson.flatMap((element) =>
        element.type === "schematic_trace"
          ? [
              {
                object: {
                  type: "trace" as const,
                  id: element.schematic_trace_id,
                },
                sheetId: element.schematic_sheet_id,
                segments: element.edges,
                polygons: element.edges.flatMap((edge) => {
                  const polygon = traceSegmentPolygon(edge.from, edge.to)
                  return polygon ? [polygon] : []
                }),
              },
            ]
          : [],
      ),
    ]
    this.solved = this.texts.length === 0
  }

  override _step(): void {
    const text = this.texts[this.index]!
    const targets = [...this.obstacles, ...this.texts.slice(this.index + 1)]
    const collisions = targets.filter((target) => this.collides(text, target))
    if (collisions.length) {
      const suggestedMove = this.findClearPosition(text)
      for (const target of collisions) {
        this.params.issues.push({
          lineItemType: "SchematicTextCollision",
          schematicSheetId: text.sheetId,
          schematicSheetName: text.sheetId
            ? this.sheetNames.get(text.sheetId)
            : undefined,
          schematicTextId: text.text.schematic_text_id,
          text: text.text.text,
          schematicComponentId: text.text.schematic_component_id,
          collidingObject: target.object,
          textBounds: polygonBounds(text.polygons),
          collidingObjectBounds: polygonBounds(target.polygons),
          suggestedMove,
          message: `Text "${text.text.text}" overlaps ${target.object.type} ${target.object.componentName ?? target.object.id}; reposition the text to leave its visible area clear.`,
        })
      }
    }
    this.index++
    this.solved = this.index >= this.texts.length
  }

  private collides(text: TextGeometry, obstacle: Obstacle): boolean {
    if (text.sheetId !== obstacle.sheetId) return false
    // Labels inside their own symbols are intentional. This does not exempt
    // them from collisions with wires, other text, or unrelated symbol bodies.
    if (
      obstacle.object.type === "component" &&
      obstacle.object.id === text.text.schematic_component_id
    )
      return false
    return text.polygons.some((a) =>
      obstacle.segments
        ? obstacle.segments.some((edge) =>
            segmentCrossesPolygon(edge.from, edge.to, a),
          )
        : obstacle.polygons.some((b) => polygonsOverlap(a, b)),
    )
  }

  private findClearPosition(
    text: TextGeometry,
  ): SchematicTextCollision["suggestedMove"] {
    const obstacles = [
      ...this.obstacles,
      ...this.texts.filter((t) => t !== text),
    ]
    const owner = this.obstacles.find(
      (obstacle) =>
        obstacle.object.type === "component" &&
        obstacle.object.id === text.text.schematic_component_id,
    )
    const originallyInsideOwner =
      owner?.polygons.some((a) =>
        text.polygons.some((b) => polygonsOverlap(a, b)),
      ) ?? false
    const step = Math.max(0.1, text.text.font_size / 2)
    for (
      let distance = step;
      distance <= Math.max(4, text.text.font_size * 8);
      distance += step
    ) {
      for (const [dx, dy] of [
        [0, distance],
        [0, -distance],
        [-distance, 0],
        [distance, 0],
      ]) {
        const newSchX = Math.round((text.text.position.x + dx!) * 1000) / 1000
        const newSchY = Math.round((text.text.position.y + dy!) * 1000) / 1000
        const moved = {
          ...text,
          polygons: getSchematicTextPolygons({
            ...text.text,
            position: { x: newSchX, y: newSchY },
          }),
        }
        // Do not turn an external reference/value into an internal label as a
        // side effect of suggesting a move. Existing internal labels stay valid.
        if (
          owner &&
          !originallyInsideOwner &&
          owner.polygons.some((a) =>
            moved.polygons.some((b) => polygonsOverlap(a, b)),
          )
        )
          continue
        if (obstacles.every((obstacle) => !this.collides(moved, obstacle)))
          return { newSchX, newSchY }
      }
    }
    return undefined
  }

  static issueToString(issue: SchematicTextCollision): string {
    const attrs: string[] = []
    addAttr(attrs, "schematicTextId", issue.schematicTextId)
    addAttr(attrs, "text", issue.text)
    addAttr(attrs, "collidingObjectType", issue.collidingObject.type)
    addAttr(attrs, "collidingObjectId", issue.collidingObject.id)
    addAttr(attrs, "newSchX", issue.suggestedMove?.newSchX)
    addAttr(attrs, "newSchY", issue.suggestedMove?.newSchY)
    addAttr(attrs, "message", issue.message)
    return `<SchematicTextCollision ${attrs.join(" ")} />`
  }
}
