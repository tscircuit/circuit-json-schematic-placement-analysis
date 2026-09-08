import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import type {
  SchematicPlacementAnalysis,
  SchematicPlacementIssue,
  SchematicBoxPlacement,
  SchematicIssueBounds,
} from "lib/index"
import {
  getIssueSchematicSheetContext,
  getRelevantPlacementsForIssues,
} from "lib/utils/issue-context"
import { centeredRect } from "lib/utils/geometry"

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
export function createIssueOverlaySvg(input: {
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
  if (input.showOverlay === false) return svg
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
      anchor ??= { x: bounds.left, y: bounds.top }
      geometry.push(
        `<rect x="${bounds.left}" y="${bounds.bottom}" width="${bounds.right - bounds.left}" height="${bounds.top - bounds.bottom}" fill="${isContext ? "none" : "#ef444433"}" stroke="${isContext ? "#2563eb" : "#dc2626"}" stroke-width="${isContext ? 1.5 : 3}" ${isContext ? 'stroke-dasharray="5 3"' : ""} vector-effect="non-scaling-stroke" />`,
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
        geometry.push(
          `<circle cx="${anchor.x}" cy="${anchor.y}" r="${9 / Math.abs(a)}" fill="#ef444433" stroke="#dc2626" stroke-width="2" vector-effect="non-scaling-stroke" />`,
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
            anchor ??= edge.from
            geometry.push(
              `<line x1="${edge.from.x}" y1="${edge.from.y}" x2="${edge.to.x}" y2="${edge.to.y}" stroke="#dc2626" stroke-width="3" vector-effect="non-scaling-stroke" />`,
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
    const badge = point
      ? `<g transform="translate(${point.x} ${point.y - 12})"><circle r="11" fill="#b91c1c" /><text y="4" text-anchor="middle" fill="white" font-family="sans-serif" font-size="11">${index + 1}</text></g>`
      : ""
    return [
      `<g data-issue-index="${index}" data-issue-type="${issue.lineItemType}"><title>${escapeXml(`#${index + 1} ${issue.lineItemType}\n${analysis.schematicIssuesToString(issue)}`)}</title><g transform="matrix(${values.join(" ")})">${geometry.join("")}</g>${badge}</g>`,
    ]
  })
  return svg.replace(
    /<\/svg>\s*$/,
    `<g class="placement-issue-overlays">${overlays.join("\n")}</g></svg>`,
  )
}
