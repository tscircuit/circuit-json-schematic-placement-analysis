import type { CircuitJson } from "circuit-json"
import type {
  SchematicPlacementAnalysis,
  SchematicPlacementIssue,
  SchematicIssueBounds,
} from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import {
  getIssueSchematicSheetContext,
  getRelevantPlacementsForIssues,
} from "lib/utils/issue-context"

type State = { circuitJson: CircuitJson; analysis: SchematicPlacementAnalysis }

/** Render the complete circuits, then frame the same components at equal scale.
 * Keep diagnostics below each panel; never label filtered analysis as a clean sheet.
 */
export function createPlacementComparisonSvg(input: {
  before: State
  after: State
  issue: SchematicPlacementIssue
  afterDiagnostic: string
  note: string
}) {
  const { before, after, issue } = input
  const unresolved = after.analysis.getIssues()
  if (unresolved.length)
    throw new Error(
      `After layout still has ${unresolved.length} unresolved findings`,
    )
  const issueIndex = before.analysis.getIssues().indexOf(issue)
  if (issueIndex < 0)
    throw new Error("Comparison issue is not in before analysis")
  const schematicSheetId =
    getIssueSchematicSheetContext(issue).schematicSheetId ?? ""
  const width = 600
  const height = 540
  const original = renderIssueOverlay({
    ...before,
    schematicSheetId,
    issueIndex,
    width,
    height,
  })
  if (!original.bounds) throw new Error("Comparison issue has no bounds")
  const placements = getRelevantPlacementsForIssues({
    issues: [issue],
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
  if (!corrected.length) throw new Error("Comparison issue has no components")
  const afterBounds = {
    left: Math.min(...corrected.map((b) => b.left)),
    right: Math.max(...corrected.map((b) => b.right)),
    bottom: Math.min(...corrected.map((b) => b.bottom)),
    top: Math.max(...corrected.map((b) => b.top)),
  }
  // Leave 0.8 schematic units around the components for labels and numbered markers.
  const commonWidth =
    Math.max(
      original.bounds.right - original.bounds.left,
      afterBounds.right - afterBounds.left,
    ) + 1.6
  const commonHeight =
    Math.max(
      original.bounds.top - original.bounds.bottom,
      afterBounds.top - afterBounds.bottom,
    ) + 1.6
  const frame = (bounds: SchematicIssueBounds) => ({
    left: (bounds.left + bounds.right - commonWidth) / 2,
    right: (bounds.left + bounds.right + commonWidth) / 2,
    bottom: (bounds.bottom + bounds.top - commonHeight) / 2,
    top: (bounds.bottom + bounds.top + commonHeight) / 2,
  })
  const beforeSvg = renderIssueOverlay({
    ...before,
    schematicSheetId,
    issueIndex,
    viewportBounds: frame(original.bounds),
    showIssueGeometry: false,
    width,
    height,
  }).svg
  const afterSvg = renderIssueOverlay({
    ...after,
    schematicSheetId,
    viewportBounds: frame(afterBounds),
    showOverlay: false,
    width,
    height,
  }).svg
  const diagnostic =
    "message" in issue && issue.message
      ? issue.message
      : before.analysis.schematicIssuesToString(issue)
  const beforeText = createAnalyzerTextSvg(diagnostic, width, [
    { number: issueIndex + 1, text: diagnostic, sheetId: schematicSheetId },
  ])
  const afterText = createAnalyzerTextSvg(input.afterDiagnostic, width)
  const textHeight = Math.max(
    ...[beforeText, afterText].map((svg) =>
      Number(svg.match(/height="([\d.]+)"/)![1]),
    ),
  )
  const note = createAnalyzerTextSvg(input.note, width * 2)
  const noteHeight = Number(note.match(/height="([\d.]+)"/)![1])
  const headerHeight = 56
  const totalHeight = headerHeight + height + textHeight + noteHeight
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2}" height="${totalHeight}" viewBox="0 0 ${width * 2} ${totalHeight}">
<rect width="100%" height="100%" fill="white" />
<text x="18" y="35" font-family="sans-serif" font-size="24" fill="#172b3a">Before — original placement</text>
<text x="${width + 18}" y="35" font-family="sans-serif" font-size="24" fill="#172b3a">After — corrected placement</text>
<svg y="${headerHeight}" width="${width}" height="${height}" overflow="hidden">${beforeSvg}</svg>
<svg x="${width}" y="${headerHeight}" width="${width}" height="${height}" overflow="hidden">${afterSvg}</svg>
<g transform="translate(0 ${headerHeight + height})">${beforeText}</g>
<g transform="translate(${width} ${headerHeight + height})">${afterText}</g>
<g transform="translate(0 ${headerHeight + height + textHeight})">${note}</g>
</svg>`.replace(/[ \t]+$/gm, "")
}
