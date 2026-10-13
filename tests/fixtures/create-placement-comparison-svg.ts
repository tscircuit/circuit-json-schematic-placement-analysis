import type { CircuitJson } from "circuit-json"
import type {
  SchematicPlacementAnalysis,
  SchematicPlacementIssue,
} from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import {
  getIssueSchematicSheetContext,
  getRelevantPlacementsForIssues,
} from "lib/utils/issue-context"

type State = { circuitJson: CircuitJson; analysis: SchematicPlacementAnalysis }

/** Frame all selected findings together, before and after, using the same world bounds. */
export function createPlacementComparisonSvg(input: {
  before: State
  after: State
  issues: readonly SchematicPlacementIssue[]
  /** Keep neighboring parts fully visible rather than clipping them at the issue bounds. */
  contextSourceComponentIds?: readonly string[]
  beforeDiagnostic: (issue: SchematicPlacementIssue) => string
  afterDiagnostic: string
  note: string
}) {
  const { before, after, issues } = input
  const unresolved = after.analysis.getIssues()
  if (unresolved.length)
    throw new Error(
      `After layout still has ${unresolved.length} unresolved findings`,
    )
  if (!issues.length) throw new Error("Comparison has no issues")
  const schematicSheetId =
    getIssueSchematicSheetContext(issues[0]!).schematicSheetId ?? ""
  const issueTypes = [...new Set(issues.map((issue) => issue.lineItemType))]
  const selected = before.analysis.getIssues({ issueTypes, schematicSheetId })
  if (
    selected.length !== issues.length ||
    issues.some((issue) => !selected.includes(issue))
  )
    throw new Error("Comparison must include all matching issues on one sheet")
  const width = 1200
  const height = 900
  const original = renderIssueOverlay({
    ...before,
    schematicSheetId,
    issueTypes,
    width,
    height,
  })
  if (!original.bounds) throw new Error("Comparison issues have no bounds")
  const placements = getRelevantPlacementsForIssues({
    issues: [...issues],
    componentPlacements: before.analysis
      .getLineItems()
      .filter((item) => item.lineItemType === "SchematicBoxPlacement"),
    circuitJson: before.circuitJson,
  })
  const corrected = placements.map((placement) => {
    const component = after.circuitJson.find(
      (e) =>
        e.type === "schematic_component" &&
        e.source_component_id === placement.sourceComponentId,
    )
    if (component?.type !== "schematic_component")
      throw new Error(
        `Missing corrected component ${placement.sourceComponentId}`,
      )
    return {
      left: component.center.x - component.size.width / 2,
      right: component.center.x + component.size.width / 2,
      bottom: component.center.y - component.size.height / 2,
      top: component.center.y + component.size.height / 2,
    }
  })
  if (!corrected.length) throw new Error("Comparison issues have no components")
  // Include both layouts and leave room for labels and numbered markers.
  // One shared window keeps stationary components in the same place in both panels.
  const context = [before, after].flatMap((state) =>
    state.circuitJson.flatMap((component) =>
      component.type === "schematic_component" &&
      component.source_component_id &&
      input.contextSourceComponentIds?.includes(component.source_component_id)
        ? [
            {
              left: component.center.x - component.size.width / 2,
              right: component.center.x + component.size.width / 2,
              bottom: component.center.y - component.size.height / 2,
              top: component.center.y + component.size.height / 2,
            },
          ]
        : [],
    ),
  )
  const bounds = [original.bounds, ...corrected, ...context]
  const viewportBounds = {
    left: Math.min(...bounds.map((b) => b.left)) - 1.2,
    right: Math.max(...bounds.map((b) => b.right)) + 1.2,
    bottom: Math.min(...bounds.map((b) => b.bottom)) - 1.2,
    top: Math.max(...bounds.map((b) => b.top)) + 1.2,
  }
  const beforeSvg = renderIssueOverlay({
    ...before,
    schematicSheetId,
    issueTypes,
    viewportBounds,
    showIssueGeometry: false,
    width,
    height,
  }).svg
  const afterSvg = renderIssueOverlay({
    ...after,
    schematicSheetId,
    viewportBounds,
    showOverlay: false,
    width,
    height,
  }).svg
  // Each complete drawing is embedded once; keep renderer IDs unique across panels.
  const scopeIds = (svg: string, prefix: string) =>
    svg
      .replace(/\sid="([^"]+)"/g, ` id="${prefix}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
      .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`)
  const markers = issues.map((issue) => ({
    number: before.analysis.getIssues().indexOf(issue) + 1,
    text: input.beforeDiagnostic(issue),
    sheetId: schematicSheetId,
  }))
  const beforeText = createAnalyzerTextSvg(
    markers.map((marker) => marker.text).join("\n"),
    width,
    markers,
  )
  const afterText = createAnalyzerTextSvg(input.afterDiagnostic, width)
  const textHeight = Math.max(
    ...[beforeText, afterText].map((svg) =>
      Number(svg.match(/height="([\d.]+)"/)![1]),
    ),
  )
  const headerHeight = 56
  const note = createAnalyzerTextSvg(input.note, width * 2)
  const noteHeight = Number(note.match(/height="([\d.]+)"/)![1])
  const noteY = headerHeight + height + textHeight
  const totalHeight = noteY + noteHeight
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2}" height="${totalHeight}" viewBox="0 0 ${width * 2} ${totalHeight}">
<rect width="100%" height="100%" fill="white" />
<g data-comparison-panel="before">
<text x="18" y="35" font-family="sans-serif" font-size="28" fill="#172b3a">Before — complete matrix, ${issues.length} ${issues.length === 1 ? "finding" : "findings"}</text>
<svg y="${headerHeight}" width="${width}" height="${height}" overflow="hidden">${scopeIds(beforeSvg, "before")}</svg>
<g transform="translate(0 ${headerHeight + height})">${beforeText}</g>
</g>
<g data-comparison-panel="after" transform="translate(${width} 0)">
<text x="18" y="35" font-family="sans-serif" font-size="28" fill="#172b3a">After — complete matrix, 0 findings</text>
<svg y="${headerHeight}" width="${width}" height="${height}" overflow="hidden">${scopeIds(afterSvg, "after")}</svg>
<g transform="translate(0 ${headerHeight + height})">${afterText}</g>
</g>
<line x1="${width}" y1="0" x2="${width}" y2="${noteY}" stroke="#9ca3af" stroke-width="2" />
<g transform="translate(0 ${noteY})">${note}</g>
</svg>`.replace(/[ \t]+$/gm, "")
}
