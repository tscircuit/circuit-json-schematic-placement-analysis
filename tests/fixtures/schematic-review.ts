import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import {
  analyzeSchematicPlacement,
  type SchematicPlacementAnalysis,
} from "../../lib/index"
import type { SchematicPlacementIssue } from "../../lib/types"
import {
  getIssueSchematicSheetContext,
  getRelevantPlacementsForIssues,
} from "../../lib/utils/issue-context"
import { buildSolverContext } from "../../lib/utils/placements"
import { escapeAttr } from "../../lib/utils/format"

export type IssueType = SchematicPlacementIssue["lineItemType"]

// Exhaustive so newly added issue types must also appear in zero-count reports.
const emptyCounts = {
  ComponentOverlap: 0,
  SchematicBoxHasALotOfSurroundingWhitespace: 0,
  CapacitorSymbolHorizontal: 0,
  VerboseSchematicNetLabel: 0,
  PinHeaderSchematicBoxTooWide: 0,
  GenericSchematicBoxTooWide: 0,
  SchematicBoxInnerLabelCollision: 0,
  SchematicPinPaddingToEdgeTooLarge: 0,
  DiodeResistorNotAligned: 0,
  ComponentPinsWouldAlignWithVerticalShift: 0,
  TraceCanBeSimplifiedByMovingComponent: 0,
  CrystalNotCenteredOverLoadCapacitors: 0,
  TwoPinComponentCouldBeFlipped: 0,
  FeedbackNetworkNotCompact: 0,
  PullResistorOnWrongSide: 0,
  ComponentNetLabelCollision: 0,
  ComponentBoxNetLabelCollision: 0,
  NetLabelCollision: 0,
  SchematicTextCollision: 0,
  ResetNetworkNotGrouped: 0,
} satisfies Record<IssueType, number>

export const issueTypes = Object.keys(emptyCounts) as IssueType[]
type Bounds = { left: number; right: number; top: number; bottom: number }
type Point = { x: number; y: number }
type Shape =
  | { type: "box"; bounds: Bounds }
  | { type: "line"; from: Point; to: Point }
export interface ReviewIssue {
  number: number
  issue: SchematicPlacementIssue
  sheetId: string
  shapes: Shape[]
}

export function getReviewSheets(circuitJson: CircuitJson) {
  const sheets = circuitJson
    .filter((e) => e.type === "schematic_sheet")
    .sort((a, b) => (a.sheet_index ?? 0) - (b.sheet_index ?? 0))
    .map((e) => ({
      id: e.schematic_sheet_id,
      name:
        "display_name" in e && typeof e.display_name === "string"
          ? e.display_name
          : (e.name ?? e.schematic_sheet_id),
    }))
  if (
    !sheets.length ||
    circuitJson.some(
      (e) =>
        ["schematic_component", "schematic_trace", "schematic_text"].includes(
          e.type,
        ) && !("schematic_sheet_id" in e && e.schematic_sheet_id),
    )
  )
    sheets.push({ id: "", name: sheets.length ? "Unassigned" : "Schematic" })
  return sheets
}

export function getReviewIssues(
  circuitJson: CircuitJson,
  analysis: SchematicPlacementAnalysis,
): ReviewIssue[] {
  const { componentPlacements } = buildSolverContext(circuitJson)
  return analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
    .map((issue, index) => {
      const sheetId =
        getIssueSchematicSheetContext(issue).schematicSheetId ?? ""
      const placements = getRelevantPlacementsForIssues({
        issues: [issue],
        componentPlacements,
        circuitJson,
      }).filter((p) => (p.schematicSheetId ?? "") === sheetId)
      const shapes: Shape[] = []
      const box = (bounds: Bounds) => shapes.push({ type: "box", bounds })
      const point = (x: number, y: number) =>
        box({ left: x - 0.1, right: x + 0.1, top: y + 0.1, bottom: y - 0.1 })
      const trace = (id: string, near?: Bounds) => {
        const target = circuitJson.find(
          (e) =>
            e.type === "schematic_trace" &&
            e.schematic_trace_id === id &&
            (e.schematic_sheet_id ?? "") === sheetId,
        )
        if (target?.type !== "schematic_trace") return
        for (const edge of target.edges) {
          if (
            near &&
            (Math.max(edge.from.x, edge.to.x) < near.left ||
              Math.min(edge.from.x, edge.to.x) > near.right ||
              Math.max(edge.from.y, edge.to.y) < near.bottom ||
              Math.min(edge.from.y, edge.to.y) > near.top)
          )
            continue
          shapes.push({ type: "line", from: edge.from, to: edge.to })
        }
      }
      if (issue.lineItemType === "SchematicTextCollision") {
        box(issue.textBounds)
        if (issue.collidingObject.type === "trace")
          trace(issue.collidingObject.id, issue.textBounds)
        else box(issue.collidingObjectBounds)
      } else {
        for (const p of placements)
          box({
            left: p.schX - p.width / 2,
            right: p.schX + p.width / 2,
            top: p.schY + p.height / 2,
            bottom: p.schY - p.height / 2,
          })
        if (
          issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent" ||
          issue.lineItemType === "TwoPinComponentCouldBeFlipped"
        )
          trace(issue.schematicTraceId)
        if (issue.lineItemType === "VerboseSchematicNetLabel")
          point(issue.schX, issue.schY)
        if (issue.lineItemType === "ComponentNetLabelCollision") {
          box(issue.overlappingLabel1Bounds)
          box(issue.overlappingLabel2Bounds)
        }
        if (issue.lineItemType === "ComponentBoxNetLabelCollision") {
          box(issue.boxBounds)
          box(issue.labelBounds)
        }
        if (issue.lineItemType === "ResetNetworkNotGrouped") {
          const port = circuitJson.find(
            (e) =>
              e.type === "schematic_port" &&
              e.source_port_id === issue.resetSourcePortId &&
              (e.schematic_sheet_id ?? "") === sheetId,
          )
          if (port?.type === "schematic_port")
            point(port.center.x, port.center.y)
        }
      }
      return { number: index + 1, issue, sheetId, shapes }
    })
}

export function countReviewIssues(
  issues: ReviewIssue[],
): Record<IssueType, number> {
  const counts = { ...emptyCounts }
  for (const { issue } of issues) counts[issue.lineItemType]++
  return counts
}

export interface ReviewOptions {
  sheetId?: string
  issueTypes?: IssueType[]
  /** Stable number in the unfiltered analysis; highlights only this finding. */
  issueNumber?: number
  zoomToIssue?: boolean
}

export function createSchematicReview(
  input: {
    circuitJson: CircuitJson
    analysis?: SchematicPlacementAnalysis
    width?: number
    height?: number
  } & ReviewOptions,
) {
  const analysis =
    input.analysis ?? analyzeSchematicPlacement(input.circuitJson)
  const width = input.width ?? 1200
  const height = input.height ?? 700
  const sheets = getReviewSheets(input.circuitJson)
  const sheetId = input.sheetId ?? sheets[0]!.id
  if (!sheets.some((sheet) => sheet.id === sheetId))
    throw new Error(`Unknown schematic sheet: ${sheetId}`)
  const allIssues = getReviewIssues(input.circuitJson, analysis)
  const sheetIssues = allIssues.filter((entry) => entry.sheetId === sheetId)
  const visibleIssues = sheetIssues.filter(
    (entry) =>
      (input.issueTypes === undefined ||
        input.issueTypes.includes(entry.issue.lineItemType)) &&
      (input.issueNumber === undefined || entry.number === input.issueNumber),
  )
  // Filter only the render. Analysis always sees the full source connectivity.
  const sheetCircuit = input.circuitJson.filter(
    (e) =>
      !e.type.startsWith("schematic_") ||
      ("schematic_sheet_id" in e ? (e.schematic_sheet_id ?? "") : "") ===
        sheetId,
  )
  let circuitSvg = convertCircuitJsonToSchematicSvg(sheetCircuit, {
    width,
    height,
  })
  // Use the renderer's own matrix, including its padding and Y-axis inversion.
  const matrixText = circuitSvg.match(
    /data-real-to-screen-transform="matrix\(([^)]+)\)"/,
  )?.[1]
  const matrix = matrixText?.trim().split(/[ ,]+/).map(Number)
  if (!matrix || matrix.length !== 6 || matrix.some((n) => !Number.isFinite(n)))
    throw new Error("Schematic SVG is missing a valid coordinate transform")
  const [a, b, c, d, e, f] = matrix as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const screen = (p: Point): Point => ({
    x: a * p.x + c * p.y + e,
    y: b * p.x + d * p.y + f,
  })
  const screenBounds = (shape: Shape): Bounds => {
    const points =
      shape.type === "line"
        ? [shape.from, shape.to]
        : [
            { x: shape.bounds.left, y: shape.bounds.top },
            { x: shape.bounds.right, y: shape.bounds.top },
            { x: shape.bounds.right, y: shape.bounds.bottom },
            { x: shape.bounds.left, y: shape.bounds.bottom },
          ]
    const transformed = points.map(screen)
    return {
      left: Math.min(...transformed.map((p) => p.x)),
      right: Math.max(...transformed.map((p) => p.x)),
      top: Math.min(...transformed.map((p) => p.y)),
      bottom: Math.max(...transformed.map((p) => p.y)),
    }
  }
  let viewLeft = 0,
    viewTop = 0,
    viewWidth = width,
    viewHeight = height
  if (
    input.zoomToIssue &&
    input.issueNumber !== undefined &&
    visibleIssues.some((entry) => entry.shapes.length)
  ) {
    const rects = visibleIssues.flatMap((entry) =>
      entry.shapes.map(screenBounds),
    )
    const left = Math.min(...rects.map((r) => r.left)) - 40
    const top = Math.min(...rects.map((r) => r.top)) - 40
    const right = Math.max(...rects.map((r) => r.right)) + 40
    const bottom = Math.max(...rects.map((r) => r.bottom)) + 40
    // Keep the viewport aspect ratio when stacking SVGs, so symbols do not stretch.
    viewHeight = Math.max(100, bottom - top, ((right - left) * height) / width)
    viewWidth = (viewHeight * width) / height
    viewLeft = (left + right - viewWidth) / 2
    viewTop = (top + bottom - viewHeight) / 2
  }
  const viewBox = `${viewLeft} ${viewTop} ${viewWidth} ${viewHeight}`
  // Keep badges and outlines readable without covering symbols when zoomed.
  const pixel = viewWidth / width
  const badges: Point[] = []
  const placeBadge = (anchor: Point): Point => {
    for (let ring = 0; ring <= visibleIssues.length; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
          const candidate = {
            x: anchor.x + dx * 25 * pixel,
            y: anchor.y + dy * 25 * pixel,
          }
          if (
            candidate.x < viewLeft + 12 * pixel ||
            candidate.x > viewLeft + viewWidth - 12 * pixel ||
            candidate.y < viewTop + 12 * pixel ||
            candidate.y > viewTop + viewHeight - 12 * pixel
          )
            continue
          if (
            badges.some(
              (p) =>
                Math.hypot(p.x - candidate.x, p.y - candidate.y) < 24 * pixel,
            )
          )
            continue
          badges.push(candidate)
          return candidate
        }
      }
    }
    return anchor
  }
  const overlays = visibleIssues
    .map((entry) => {
      if (!entry.shapes.length) return ""
      const markup = entry.shapes
        .map((shape) => {
          if (shape.type === "line") {
            const p = screen(shape.from),
              q = screen(shape.to)
            return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#e11d48" stroke-width="${5 * pixel}" stroke-opacity="0.55" />`
          }
          const r = screenBounds(shape)
          return `<rect x="${r.left}" y="${r.top}" width="${Math.max(r.right - r.left, 2 * pixel)}" height="${Math.max(r.bottom - r.top, 2 * pixel)}" fill="#ef4444" fill-opacity="0.16" stroke="#dc2626" stroke-width="${1.5 * pixel}" />`
        })
        .join("")
      const anchor = screenBounds(entry.shapes[0]!)
      const anchorX = Math.max(
        viewLeft + 12 * pixel,
        Math.min(viewLeft + viewWidth - 12 * pixel, anchor.left),
      )
      const anchorY = Math.max(
        viewTop + 12 * pixel,
        Math.min(viewTop + viewHeight - 12 * pixel, anchor.top - 12 * pixel),
      )
      const { x, y } = placeBadge({ x: anchorX, y: anchorY })
      const leader =
        x === anchorX && y === anchorY
          ? ""
          : `<line x1="${x}" y1="${y}" x2="${anchorX}" y2="${anchor.top}" stroke="#b91c1c" stroke-width="${pixel}" />`
      return `<g data-issue-number="${entry.number}" data-issue-type="${entry.issue.lineItemType}" data-sheet-id="${escapeAttr(sheetId)}"><title>Issue ${entry.number}: ${entry.issue.lineItemType}</title>${markup}${leader}<circle cx="${x}" cy="${y}" r="${11 * pixel}" fill="#b91c1c" /><text x="${x}" y="${y}" dy="0.35em" text-anchor="middle" font-family="sans-serif" font-size="${11 * pixel}" fill="white">${entry.number}</text></g>`
    })
    .join("")
  circuitSvg = circuitSvg
    .replace("<svg ", `<svg viewBox="${viewBox}" `)
    .replace(
      /<\/svg>\s*$/,
      `<g class="placement-issue-overlays">${overlays}</g></svg>`,
    )
  const counts = countReviewIssues(allIssues)
  const sheetCounts = countReviewIssues(sheetIssues)
  const unlocated = visibleIssues.filter((entry) => entry.shapes.length === 0)
  const text = [
    "Emitted issue counts (all sheets / selected sheet):",
    ...issueTypes.map(
      (type) => `${type}: ${counts[type]} / ${sheetCounts[type]}`,
    ),
    `Sheet: ${sheets.find((sheet) => sheet.id === sheetId)!.name}`,
    `Selected types: ${input.issueTypes?.join(", ") ?? "All"}`,
    `Matching issues shown: ${visibleIssues.length}`,
    ...(unlocated.length
      ? [
          `No overlay geometry: ${unlocated.map((entry) => `#${entry.number}`).join(", ")}`,
        ]
      : []),
    ...visibleIssues.flatMap((entry) => [
      `#${entry.number}`,
      analysis.schematicIssuesToString(entry.issue) ||
        JSON.stringify(entry.issue),
    ]),
  ].join("\n")
  return {
    circuitSvg,
    text,
    allIssues,
    visibleIssues,
    counts,
    sheetCounts,
    sheets,
    sheetId,
  }
}
