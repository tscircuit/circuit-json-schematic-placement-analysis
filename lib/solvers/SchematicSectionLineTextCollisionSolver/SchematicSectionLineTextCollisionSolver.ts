import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  SchematicBoxPlacement,
  SchematicPlacementIssue,
  SchematicSectionLineTextCollision,
} from "../../types"
import { addAttr } from "../../utils/format"
import { centeredRect } from "../../utils/geometry"
import { getSchematicSheetNamesById } from "../../utils/schematic-sheets"
import {
  getSchematicSymbolLabelGeometries,
  getSchematicTextPolygons,
  type Point,
  type Polygon,
  type PositionedSchematicText,
  polygonBounds,
  polygonsOverlap,
  rectPolygon,
  segmentCrossesPolygon,
  traceSegmentPolygon,
} from "../../utils/schematic-text-geometry"
import type { SolverContext } from "../SolverContext"

interface SectionLineObstacle {
  schematicLineId: string
  sheetId?: string
  from: Point
  to: Point
  polygons: Polygon[]
}

interface ClearanceObstacle {
  sheetId?: string
  polygons: Polygon[]
  segments?: Array<{ from: Point; to: Point }>
}

interface CandidateLabel {
  textGeometry: PositionedSchematicText
  polygons: Polygon[]
  sheetId?: string
  schematicTextId?: string
  schematicBox?: SchematicBoxPlacement
  schematicComponentId?: string
  sourceComponentName?: string
  isStandaloneMovableText: boolean
}

export class SchematicSectionLineTextCollisionSolver extends BaseSolver {
  private readonly sectionLines: SectionLineObstacle[]
  private readonly labels: CandidateLabel[]
  private readonly clearanceObstacles: ClearanceObstacle[]
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

    this.sectionLines = ctx.circuitJson.flatMap((element) => {
      // Core emits schematic section dividers as unowned dashed schematic_line records.
      // Component/symbol-owned lines are part of symbol artwork, not section dividers.
      if (
        element.type !== "schematic_line" ||
        !element.is_dashed ||
        element.schematic_component_id ||
        ("schematic_symbol_id" in element && element.schematic_symbol_id)
      ) {
        return []
      }
      if (
        ![element.x1, element.y1, element.x2, element.y2].every(Number.isFinite)
      ) {
        return []
      }
      const from = { x: element.x1, y: element.y1 }
      const to = { x: element.x2, y: element.y2 }
      const polygon = traceSegmentPolygon(from, to)
      if (!polygon) return []
      return [
        {
          schematicLineId: element.schematic_line_id,
          sheetId: element.schematic_sheet_id,
          from,
          to,
          polygons: [polygon],
        },
      ]
    })

    if (this.sectionLines.length === 0) {
      this.labels = []
      this.clearanceObstacles = []
      this.solved = true
      return
    }

    const placementByComponentId = new Map(
      ctx.componentPlacements.flatMap((placement) =>
        placement.schematicComponentId
          ? [[placement.schematicComponentId, placement] as const]
          : [],
      ),
    )
    const sourceNameByComponentId = new Map<string, string>()
    const sourceNameBySourceId = new Map(
      ctx.circuitJson.flatMap((element) =>
        element.type === "source_component"
          ? [
              [
                element.source_component_id,
                element.display_name ?? element.name,
              ] as const,
            ]
          : [],
      ),
    )
    for (const element of ctx.circuitJson) {
      if (
        element.type !== "schematic_component" ||
        !element.source_component_id
      )
        continue
      const name = sourceNameBySourceId.get(element.source_component_id)
      if (name)
        sourceNameByComponentId.set(element.schematic_component_id, name)
    }

    const seenFingerprints = new Set<string>()
    const pushLabel = (entry: Omit<CandidateLabel, "polygons">): void => {
      const polygons = getSchematicTextPolygons(entry.textGeometry)
      if (!polygons.length) return
      const fingerprint = JSON.stringify([
        entry.sheetId ?? "",
        entry.textGeometry.text,
        Math.round(entry.textGeometry.schX * 1e6),
        Math.round(entry.textGeometry.schY * 1e6),
        entry.textGeometry.fontSize,
        entry.textGeometry.anchor,
        entry.textGeometry.schRotation,
      ])
      if (seenFingerprints.has(fingerprint)) return
      seenFingerprints.add(fingerprint)
      this.labels.push({ ...entry, polygons })
    }

    this.labels = []
    for (const element of ctx.circuitJson) {
      if (element.type !== "schematic_text") continue
      const schematicComponentId = element.schematic_component_id
      const isOwnedBySymbol = Boolean(element.schematic_symbol_id)
      const isOwnedByTrace = Boolean(
        "source_trace_id" in element && element.source_trace_id,
      )
      const schematicBox = schematicComponentId
        ? placementByComponentId.get(schematicComponentId)
        : undefined
      pushLabel({
        textGeometry: {
          text: element.text,
          schX: element.position.x,
          schY: element.position.y,
          fontSize: element.font_size,
          anchor: element.anchor,
          schRotation: element.rotation,
          color: element.color,
        },
        sheetId: element.schematic_sheet_id,
        schematicTextId: element.schematic_text_id,
        schematicBox,
        schematicComponentId,
        sourceComponentName:
          schematicBox?.sourceComponentName ??
          (schematicComponentId
            ? sourceNameByComponentId.get(schematicComponentId)
            : undefined),
        isStandaloneMovableText:
          !schematicComponentId && !isOwnedBySymbol && !isOwnedByTrace,
      })
    }

    for (const symbolLabel of getSchematicSymbolLabelGeometries(
      ctx.circuitJson,
    )) {
      const schematicComponentId =
        symbolLabel.schematicComponent.schematic_component_id
      const schematicBox = placementByComponentId.get(schematicComponentId)
      pushLabel({
        textGeometry: symbolLabel.textGeometry,
        sheetId: symbolLabel.schematicComponent.schematic_sheet_id,
        schematicBox,
        schematicComponentId,
        sourceComponentName:
          schematicBox?.sourceComponentName ?? symbolLabel.sourceComponentName,
        isStandaloneMovableText: false,
      })
    }

    const customSymbolIds = new Set(
      ctx.circuitJson.flatMap((element) =>
        element.type === "schematic_component" &&
        element.is_box_with_pins === false &&
        !element.symbol_name
          ? [element.schematic_component_id]
          : [],
      ),
    )
    this.clearanceObstacles = [
      ...this.sectionLines.map((line) => ({
        sheetId: line.sheetId,
        polygons: line.polygons,
        segments: [{ from: line.from, to: line.to }],
      })),
      ...ctx.componentPlacements.flatMap((placement) =>
        placement.schematicComponentId &&
        !customSymbolIds.has(placement.schematicComponentId)
          ? [
              {
                sheetId: placement.schematicSheetId,
                polygons: [
                  rectPolygon(
                    centeredRect(
                      placement.schX,
                      placement.schY,
                      placement.width,
                      placement.height,
                    ),
                  ),
                ],
              },
            ]
          : [],
      ),
      ...ctx.circuitJson.flatMap((element) =>
        element.type === "schematic_trace"
          ? [
              {
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

    this.solved = this.labels.length === 0
  }

  override _step(): void {
    const label = this.labels[this.index]!
    const collidingLines = this.sectionLines.filter(
      (line) =>
        (line.sheetId ?? "") === (label.sheetId ?? "") &&
        label.polygons.some((polygon) =>
          segmentCrossesPolygon(line.from, line.to, polygon),
        ),
    )
    if (collidingLines.length > 0) {
      const suggestedMove = label.isStandaloneMovableText
        ? this.findClearPosition(label)
        : undefined
      for (const line of collidingLines) {
        const componentDescriptor = label.sourceComponentName
          ? ` on component ${label.sourceComponentName}`
          : ""
        const guidance = label.schematicComponentId
          ? "adjust the component placement or section layout so the label stays inside its section."
          : label.isStandaloneMovableText
            ? "reposition the text or section divider so the visible text area stays clear."
            : "adjust the trace label placement or section divider so the visible text area stays clear."
        this.params.issues.push({
          lineItemType: "SchematicSectionLineTextCollision",
          schematicSheetId: label.sheetId,
          schematicSheetName: label.sheetId
            ? this.sheetNames.get(label.sheetId)
            : undefined,
          schematicLineId: line.schematicLineId,
          schematicTextId: label.schematicTextId,
          componentSchematicBox: label.schematicBox,
          schematicComponentId: label.schematicComponentId,
          sourceComponentName: label.sourceComponentName,
          text: label.textGeometry.text,
          textBounds: polygonBounds(label.polygons),
          lineBounds: polygonBounds(line.polygons),
          suggestedMove,
          message: `Text "${label.textGeometry.text}"${componentDescriptor} crosses schematic section divider ${line.schematicLineId}; ${guidance}`,
        })
      }
    }
    this.index++
    this.solved = this.index >= this.labels.length
  }

  private findClearPosition(
    label: CandidateLabel,
  ): SchematicSectionLineTextCollision["suggestedMove"] {
    const otherLabels: ClearanceObstacle[] = this.labels
      .filter((other) => other !== label)
      .map((other) => ({
        sheetId: other.sheetId,
        polygons: other.polygons,
      }))
    const obstacles = [...this.clearanceObstacles, ...otherLabels]
    const step = Math.max(0.1, label.textGeometry.fontSize / 2)
    for (
      let distance = step;
      distance <= Math.max(4, label.textGeometry.fontSize * 8);
      distance += step
    ) {
      for (const [dx, dy] of [
        [0, distance],
        [0, -distance],
        [-distance, 0],
        [distance, 0],
      ]) {
        const newSchX =
          Math.round((label.textGeometry.schX + dx!) * 1000) / 1000
        const newSchY =
          Math.round((label.textGeometry.schY + dy!) * 1000) / 1000
        const movedPolygons = getSchematicTextPolygons({
          ...label.textGeometry,
          schX: newSchX,
          schY: newSchY,
        })
        const clear = obstacles.every((obstacle) => {
          if ((obstacle.sheetId ?? "") !== (label.sheetId ?? "")) return true
          return !movedPolygons.some((polygon) =>
            obstacle.segments
              ? obstacle.segments.some((edge) =>
                  segmentCrossesPolygon(edge.from, edge.to, polygon),
                )
              : obstacle.polygons.some((other) =>
                  polygonsOverlap(polygon, other),
                ),
          )
        })
        if (clear) return { newSchX, newSchY }
      }
    }
    return undefined
  }

  static issueToString(issue: SchematicSectionLineTextCollision): string {
    const attrs: string[] = []
    addAttr(attrs, "text", issue.text)
    addAttr(attrs, "componentName", issue.sourceComponentName)
    addAttr(attrs, "schematicLineId", issue.schematicLineId)
    addAttr(attrs, "newSchX", issue.suggestedMove?.newSchX)
    addAttr(attrs, "newSchY", issue.suggestedMove?.newSchY)
    addAttr(attrs, "message", issue.message)
    return `<SchematicSectionLineTextCollision ${attrs.join(" ")} />`
  }
}
