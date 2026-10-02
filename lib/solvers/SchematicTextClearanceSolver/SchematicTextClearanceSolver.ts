import { BaseSolver } from "@tscircuit/solver-utils"
import type { SchematicText } from "circuit-json"
import type {
  SchematicPlacementIssue,
  SchematicTextCollision,
  SchematicTextCollisionObject,
} from "../../types"
import { addAttr } from "../../utils/format"
import { centeredRect } from "../../utils/geometry"
import { getComponentSymbolGeometry } from "../../utils/component-symbol-geometry"
import { getNetLabelBounds } from "../../utils/net-label-bounds"
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
    const symbolGeometry = getComponentSymbolGeometry(ctx.circuitJson)
    const symbolTexts = [...symbolGeometry.values()].flatMap((g) => g.texts)
    const symbolTextIds = new Set(symbolTexts.map((t) => t.schematic_text_id))
    const componentBySymbolId = new Map(
      ctx.componentPlacements.flatMap((p) =>
        p.schematicSymbolId && p.schematicComponentId
          ? [[p.schematicSymbolId, p.schematicComponentId]]
          : [],
      ),
    )
    this.texts = [...ctx.circuitJson, ...symbolTexts].flatMap((element) => {
      if (element.type !== "schematic_text") return []
      // Component and trace annotations still need collision detection, but
      // they cannot safely be repositioned as independent schematic text.
      const polygons = getSchematicTextPolygons(element, {
        isSymbolText: symbolTextIds.has(element.schematic_text_id),
      })
      if (!polygons.length) return []
      const sheetId = element.schematic_sheet_id
      // Some exports emit the same trace label twice. Identical overprinting
      // does not obscure another annotation and should not duplicate warnings.
      const fingerprint = JSON.stringify([
        sheetId,
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
          isTraceLabel: Boolean(
            "source_trace_id" in element && element.source_trace_id,
          ),
          polygons,
          sheetId,
          object: {
            type: "text" as const,
            id: element.schematic_text_id,
            text: element.text,
            schematicComponentId:
              element.schematic_component_id ??
              componentBySymbolId.get(element.schematic_symbol_id ?? ""),
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
                  rectPolygon(
                    symbolGeometry.get(p.schematicComponentId)?.bounds ??
                      centeredRect(p.schX, p.schY, p.width, p.height),
                  ),
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
      ...ctx.circuitJson.flatMap((element) =>
        element.type === "schematic_net_label"
          ? [
              {
                object: {
                  type: "net_label" as const,
                  id: element.schematic_net_label_id,
                  text: element.text,
                },
                sheetId: element.schematic_sheet_id,
                polygons: [rectPolygon(getNetLabelBounds(element))],
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
      const componentOwned = Boolean(
        text.text.schematic_component_id || text.text.schematic_symbol_id,
      )
      const suggestedMove =
        text.isTraceLabel || componentOwned
          ? undefined
          : this.findClearPosition(text)
      for (const target of collisions) {
        this.params.issues.push({
          lineItemType: "SchematicTextCollision",
          schematicSheetId: text.sheetId,
          schematicSheetName: text.sheetId
            ? this.sheetNames.get(text.sheetId)
            : undefined,
          schematicTextId: text.text.schematic_text_id,
          schematicComponentId: text.object.schematicComponentId,
          text: text.text.text,
          collidingObject: target.object,
          textBounds: polygonBounds(text.polygons),
          collidingObjectBounds: polygonBounds(target.polygons),
          suggestedMove,
          message: `Text "${text.text.text}" overlaps ${target.object.type} ${target.object.componentName ?? target.object.id}; ${
            componentOwned
              ? "adjust the component's label placement or the overlapping object to leave the visible text area clear."
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
    // Symbol annotations may intentionally sit inside their own symbol body.
    if (
      obstacle.object.type === "component" &&
      text.object.schematicComponentId === obstacle.object.schematicComponentId
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
    addAttr(attrs, "schematicTextId", issue.schematicTextId)
    addAttr(attrs, "schematicComponentId", issue.schematicComponentId)
    addAttr(attrs, "text", issue.text)
    addAttr(attrs, "collidingObjectType", issue.collidingObject.type)
    addAttr(attrs, "collidingObjectId", issue.collidingObject.id)
    addAttr(attrs, "newSchX", issue.suggestedMove?.newSchX)
    addAttr(attrs, "newSchY", issue.suggestedMove?.newSchY)
    addAttr(attrs, "message", issue.message)
    return `<SchematicTextCollision ${attrs.join(" ")} />`
  }
}
