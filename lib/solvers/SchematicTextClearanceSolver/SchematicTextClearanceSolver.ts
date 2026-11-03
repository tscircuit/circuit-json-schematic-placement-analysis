import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicComponent, SchematicText } from "circuit-json"
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
  getComponentSymbolTexts,
  type SchematicTextLayout,
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
  source: SchematicText | SchematicComponent
  text: SchematicTextLayout
  isComponentLabel: boolean
  isTraceLabel: boolean
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
    this.texts = [
      ...ctx.circuitJson.flatMap((element) =>
        element.type === "schematic_text"
          ? [{ source: element, text: element }]
          : [],
      ),
      ...getComponentSymbolTexts(ctx.circuitJson).map(
        ({ component, layout }) => ({
          source: component,
          text: layout,
        }),
      ),
    ].flatMap(({ source, text }) => {
      const polygons = getSchematicTextPolygons(text)
      if (!polygons.length) return []
      const sheetId = source.schematic_sheet_id
      // Some exports emit the same trace label twice. Identical overprinting
      // does not obscure another annotation and should not duplicate warnings.
      const fingerprint = JSON.stringify([
        sheetId,
        text.text,
        text.position.x,
        text.position.y,
        text.font_size,
        text.anchor,
        text.rotation,
        text.color,
      ])
      if (seenText.has(fingerprint)) return []
      seenText.add(fingerprint)
      return [
        {
          source,
          text,
          isComponentLabel:
            source.type === "schematic_component" ||
            Boolean(
              source.schematic_component_id || source.schematic_symbol_id,
            ),
          isTraceLabel: Boolean(
            source.type === "schematic_text" && source.source_trace_id,
          ),
          polygons,
          sheetId,
          object: {
            type: "text" as const,
            id:
              source.type === "schematic_text"
                ? source.schematic_text_id
                : source.schematic_component_id,
            text: text.text,
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
      ...ctx.circuitJson.flatMap((element) => {
        // Component-owned lines are symbol artwork, not section dividers.
        if (
          element.type !== "schematic_line" ||
          element.schematic_component_id ||
          element.schematic_symbol_id
        )
          return []
        const from = { x: element.x1, y: element.y1 }
        const to = { x: element.x2, y: element.y2 }
        const polygon = traceSegmentPolygon(from, to)
        return polygon
          ? [
              {
                object: {
                  type: "line" as const,
                  id: element.schematic_line_id,
                },
                sheetId: element.schematic_sheet_id,
                segments: [{ from, to }],
                polygons: [polygon],
              },
            ]
          : []
      }),
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
    const targets = [
      ...this.obstacles,
      ...this.texts.slice(this.index + 1).filter((t) => !t.isComponentLabel),
    ]
    const collisions = targets.filter((target) => this.collides(text, target))
    if (collisions.length) {
      const suggestedMove =
        text.isTraceLabel || text.isComponentLabel
          ? undefined
          : this.findClearPosition(text)
      for (const target of collisions) {
        const targetName = target.object.componentName ?? target.object.text
        this.params.issues.push({
          lineItemType: "SchematicTextCollision",
          schematicSheetId: text.sheetId,
          schematicSheetName: text.sheetId
            ? this.sheetNames.get(text.sheetId)
            : undefined,
          schematicTextId:
            text.source.type === "schematic_text"
              ? text.source.schematic_text_id
              : undefined,
          schematicComponentId: text.source.schematic_component_id,
          text: text.text.text,
          collidingObject: target.object,
          textBounds: polygonBounds(text.polygons),
          collidingObjectBounds: polygonBounds(target.polygons),
          suggestedMove,
          message: `Text "${text.text.text}" overlaps ${target.object.type}${targetName ? ` ${targetName}` : ""}; ${
            text.isComponentLabel
              ? "adjust the owning component or section divider to leave the visible text area clear."
              : text.isTraceLabel
                ? "adjust the owning trace's label placement or remove stale duplicates to leave the visible text area clear."
                : "reposition the text to leave its visible area clear."
          }`,
        })
      }
    }
    this.index++
    this.solved = this.index >= this.texts.length
  }

  private collides(text: TextGeometry, obstacle: Obstacle): boolean {
    if (text.sheetId !== obstacle.sheetId) return false
    // Reference/value labels move with their component. Check their divider
    // crossings without treating the component's own body or wires as obstacles.
    if (text.isComponentLabel && obstacle.object.type !== "line") return false
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
      ...this.texts.filter((t) => t !== text && !t.isComponentLabel),
    ]
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
        if (obstacles.every((obstacle) => !this.collides(moved, obstacle)))
          return { newSchX, newSchY }
      }
    }
    return undefined
  }

  static issueToString(issue: SchematicTextCollision): string {
    const attrs: string[] = []
    addAttr(attrs, "text", issue.text)
    addAttr(attrs, "collidingObjectType", issue.collidingObject.type)
    addAttr(attrs, "collidingText", issue.collidingObject.text)
    addAttr(attrs, "newSchX", issue.suggestedMove?.newSchX)
    addAttr(attrs, "newSchY", issue.suggestedMove?.newSchY)
    addAttr(attrs, "message", issue.message)
    return `<SchematicTextCollision ${attrs.join(" ")} />`
  }
}
