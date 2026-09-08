import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import type {
  SchematicPlacementAnalysis,
  SchematicPlacementIssue,
  SchematicBoxPlacement,
  SchematicIssueBounds,
} from "../index"
import {
  getIssueSchematicSheetContext,
  getRelevantPlacementsForIssues,
} from "../utils/issue-context"
import { centeredRect } from "../utils/geometry"

export type IssueType = SchematicPlacementIssue["lineItemType"]

export function getReproSheets(circuitJson: CircuitJson) {
  const ids = new Set(
    circuitJson.flatMap((element) =>
      element.type.startsWith("schematic_")
        ? [
            ("schematic_sheet_id" in element
              ? element.schematic_sheet_id
              : undefined) ?? "",
          ]
        : [],
    ),
  )
  return [...ids].map((id) => {
    const sheet = circuitJson.find(
      (element) =>
        element.type === "schematic_sheet" && element.schematic_sheet_id === id,
    )
    return {
      id,
      name:
        sheet?.type === "schematic_sheet"
          ? sheet.name || id
          : id || "Unassigned sheet",
    }
  })
}

const escapeXml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;")
    .replaceAll(">", "&gt;")
const boxBounds = (box: SchematicBoxPlacement) =>
  centeredRect(box.schX, box.schY, box.width, box.height)

/** Use the renderer's own transform, never infer scale from component extents.
 * Render one sheet at a time so overlapping coordinates on other sheets cannot leak in. */
export function renderIssueOverlay(input: {
  circuitJson: CircuitJson
  analysis: SchematicPlacementAnalysis
  schematicSheetId?: string
  issueTypes?: readonly IssueType[]
  issueIndex?: number
  showOverlay?: boolean
  width?: number
  height?: number
}) {
  const { circuitJson, analysis } = input
  const sheetId =
    input.schematicSheetId ?? getReproSheets(circuitJson)[0]?.id ?? ""
  const sheetJson = circuitJson.filter(
    (element) =>
      !element.type.startsWith("schematic_") ||
      (("schematic_sheet_id" in element
        ? element.schematic_sheet_id
        : undefined) ?? "") === sheetId,
  )
  const svg = convertCircuitJsonToSchematicSvg(sheetJson, {
    width: input.width ?? 1400,
    height: input.height ?? 900,
  })
  const matrix = svg.match(/data-real-to-screen-transform="matrix\(([^)]+)\)"/)
  if (!matrix)
    throw new Error(
      "Schematic renderer did not provide its coordinate transform",
    )
  const values = matrix[1]!.split(/[\s,]+/).map(Number)
  if (values.length !== 6 || values.some((value) => !Number.isFinite(value)))
    throw new Error("Invalid schematic transform")
  const [a, b, c, d, e, f] = values as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const screen = (x: number, y: number) => ({
    x: a * x + c * y + e,
    y: b * x + d * y + f,
  })
  const issueBounds: SchematicIssueBounds[] = []
  const focusPoints: Array<{ x: number; y: number }> = []
  const includeBounds = (bounds: SchematicIssueBounds) => {
    issueBounds.push(bounds)
    for (const x of [bounds.left, bounds.right]) {
      for (const y of [bounds.bottom, bounds.top])
        focusPoints.push(screen(x, y))
    }
  }
  const placements = analysis
    .getLineItems()
    .filter((item) => item.lineItemType === "SchematicBoxPlacement")
  const overlays = analysis.getIssues().flatMap((issue, index) => {
    if (
      (getIssueSchematicSheetContext(issue).schematicSheetId ?? "") !==
        sheetId ||
      (input.issueTypes !== undefined &&
        !input.issueTypes.includes(issue.lineItemType)) ||
      (input.issueIndex !== undefined && index !== input.issueIndex)
    )
      return []
    const context = getRelevantPlacementsForIssues({
      issues: [issue],
      componentPlacements: placements,
      circuitJson,
    })
    const geometry: string[] = []
    let anchor: { x: number; y: number } | undefined
    const rect = (bounds: SchematicIssueBounds, isContext = false) => {
      includeBounds(bounds)
      anchor ??= { x: bounds.left, y: bounds.top }
      geometry.push(
        `<rect x="${bounds.left}" y="${bounds.bottom}" width="${bounds.right - bounds.left}" height="${bounds.top - bounds.bottom}" fill="${isContext ? "none" : "#ef444433"}" stroke="${isContext ? "#2563eb" : "#dc2626"}" stroke-width="${isContext ? 0.35 : 0.5}" ${isContext ? 'stroke-dasharray="5 3"' : ""} vector-effect="non-scaling-stroke" />`,
      )
    }
    for (const placement of context) rect(boxBounds(placement), true)
    // Prefer diagnostic geometry for the numbered marker over contextual boxes.
    anchor = undefined
    switch (issue.lineItemType) {
      case "ComponentOverlap": {
        const first = boxBounds(issue.firstComponent)
        const second = boxBounds(issue.secondComponent)
        rect({
          left: Math.max(first.left, second.left),
          right: Math.min(first.right, second.right),
          top: Math.min(first.top, second.top),
          bottom: Math.max(first.bottom, second.bottom),
        })
        break
      }
      case "NetLabelCollision":
        for (const bounds of issue.collisionBounds ?? []) rect(bounds)
        break
      case "ComponentNetLabelCollision":
        rect(issue.overlappingLabel1Bounds)
        rect(issue.overlappingLabel2Bounds)
        break
      case "ComponentBoxNetLabelCollision":
        rect(issue.boxBounds)
        rect(issue.labelBounds)
        break
      case "VerboseSchematicNetLabel": {
        anchor = { x: issue.schX, y: issue.schY }
        includeBounds(
          centeredRect(anchor.x, anchor.y, 18 / Math.abs(a), 18 / Math.abs(d)),
        )
        geometry.push(
          `<circle cx="${anchor.x}" cy="${anchor.y}" r="${9 / Math.abs(a)}" fill="#ef444433" stroke="#dc2626" stroke-width="0.5" vector-effect="non-scaling-stroke" />`,
        )
        break
      }
      case "TraceCanBeSimplifiedByMovingComponent": {
        const trace = sheetJson.find(
          (element) =>
            element.type === "schematic_trace" &&
            element.schematic_trace_id === issue.schematicTraceId,
        )
        if (trace?.type === "schematic_trace")
          for (const edge of trace.edges) {
            includeBounds({
              left: Math.min(edge.from.x, edge.to.x),
              right: Math.max(edge.from.x, edge.to.x),
              bottom: Math.min(edge.from.y, edge.to.y),
              top: Math.max(edge.from.y, edge.to.y),
            })
            anchor ??= edge.from
            geometry.push(
              `<line x1="${edge.from.x}" y1="${edge.from.y}" x2="${edge.to.x}" y2="${edge.to.y}" stroke="#dc2626" stroke-width="0.5" vector-effect="non-scaling-stroke" />`,
            )
          }
        break
      }
      default:
        for (const placement of context) rect(boxBounds(placement))
    }
    anchor ??= context[0]
      ? { x: context[0].schX, y: context[0].schY }
      : undefined
    const point = anchor && screen(anchor.x, anchor.y)
    return [
      {
        index,
        point,
        geometry: `<title>${escapeXml(`#${index + 1} ${issue.lineItemType}\n${analysis.schematicIssuesToString(issue)}`)}</title><g transform="matrix(${values.join(" ")})">${geometry.join("")}</g>`,
        issueType: issue.lineItemType,
      },
    ]
  })
  let framedSvg = svg
  let badgeScale = 1
  if (focusPoints.length > 0) {
    const minX = Math.min(...focusPoints.map((point) => point.x))
    const maxX = Math.max(...focusPoints.map((point) => point.x))
    const minY = Math.min(...focusPoints.map((point) => point.y))
    const maxY = Math.max(...focusPoints.map((point) => point.y))
    // Half a bounds-width/height of padding on each side. A small minimum also
    // gives point-like or perfectly horizontal/vertical issues a useful frame.
    const paddingX = Math.max((maxX - minX) / 2, 12)
    const paddingY = Math.max((maxY - minY) / 2, 12)
    const width = maxX - minX + paddingX * 2
    const height = maxY - minY + paddingY * 2
    const viewBox = `${minX - paddingX} ${minY - paddingY} ${width} ${height}`
    framedSvg = svg.replace(/^<svg\b[^>]*>/, (root) =>
      root
        .replace(/\sviewBox="[^"]*"/, "")
        .replace(/>$/, ` viewBox="${viewBox}">`),
    )
    // Keep numbered markers readable without magnifying them with the crop.
    badgeScale = Math.max(
      width / (input.width ?? 1400),
      height / (input.height ?? 900),
    )
  }
  const bounds = issueBounds.length
    ? {
        left: Math.min(...issueBounds.map((bounds) => bounds.left)),
        right: Math.max(...issueBounds.map((bounds) => bounds.right)),
        top: Math.max(...issueBounds.map((bounds) => bounds.top)),
        bottom: Math.min(...issueBounds.map((bounds) => bounds.bottom)),
      }
    : undefined
  if (input.showOverlay === false) return { svg: framedSvg, bounds }
  const markup = overlays.map(({ index, point, geometry, issueType }) => {
    const badge = point
      ? `<g transform="translate(${point.x} ${point.y}) scale(${badgeScale})"><circle cy="-12" r="11" fill="#b91c1c" /><text y="-8" text-anchor="middle" fill="white" font-family="sans-serif" font-size="11">${index + 1}</text></g>`
      : ""
    return `<g data-issue-index="${index}" data-issue-type="${issueType}">${geometry}${badge}</g>`
  })
  return {
    bounds,
    svg: framedSvg.replace(
      /<\/svg>\s*$/,
      `<g class="placement-issue-overlays">${markup.join("\n")}</g></svg>`,
    ),
  }
}

export function createIssueOverlaySvg(
  input: Parameters<typeof renderIssueOverlay>[0],
): string {
  return renderIssueOverlay(input).svg
}
