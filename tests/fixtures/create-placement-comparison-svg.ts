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
  issues: readonly SchematicPlacementIssue[]
  afterDiagnostic: (issue: SchematicPlacementIssue) => string
  note: string
}) {
  const { before, after } = input
  const unresolved = after.analysis.getIssues()
  if (unresolved.length)
    throw new Error(
      `After layout still has ${unresolved.length} unresolved findings`,
    )
  if (!input.issues.length) throw new Error("Comparison has no issues")
  const sheets = new Map<string, string>()
  const definitions: string[] = []
  const reuseSheet = (svg: string) => {
    const root = svg.match(/^<svg\b[^>]*>/)![0]
    const closing = svg.lastIndexOf("</svg>")
    const overlay = svg.indexOf('<g class="placement-issue-overlays">')
    const body = svg.slice(root.length, overlay < 0 ? closing : overlay)
    let id = sheets.get(body)
    if (!id) {
      id = `comparison-sheet-${sheets.size}`
      sheets.set(body, id)
      // Scope renderer IDs to each definition when both sheets share one SVG.
      const content = body
        .replace(/\sid="([^"]+)"/g, ` id="${id}-$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${id}-$1)`)
        .replace(/href="#([^"]+)"/g, `href="#${id}-$1"`)
      definitions.push(`<g id="${id}">${content}</g>`)
    }
    return `${root}<use href="#${id}" />${overlay < 0 ? "" : svg.slice(overlay, closing)}</svg>`
  }
  let offset = 0
  const rows = input.issues.map((issue) => {
    const issueIndex = before.analysis.getIssues().indexOf(issue)
    if (issueIndex < 0)
      throw new Error("Comparison issue is not in before analysis")
    const schematicSheetId =
      getIssueSchematicSheetContext(issue).schematicSheetId ?? ""
    const width = 600
    const height = 360
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
    // Keep the same vertical window so stationary neighbors do not jump between panels.
    const bottom = Math.min(original.bounds.bottom, afterBounds.bottom) - 0.8
    const top = Math.max(original.bounds.top, afterBounds.top) + 0.8
    const frame = (bounds: SchematicIssueBounds) => ({
      left: (bounds.left + bounds.right - commonWidth) / 2,
      right: (bounds.left + bounds.right + commonWidth) / 2,
      bottom,
      top,
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
    const afterText = createAnalyzerTextSvg(input.afterDiagnostic(issue), width)
    const textHeight = Math.max(
      ...[beforeText, afterText].map((svg) =>
        Number(svg.match(/height="([\d.]+)"/)![1]),
      ),
    )
    const headerHeight = 56
    const rowHeight = headerHeight + height + textHeight
    const result = `<g data-comparison-issue-number="${issueIndex + 1}" transform="translate(0 ${offset})">
<text x="18" y="35" font-family="sans-serif" font-size="24" fill="#172b3a">Before — finding #${issueIndex + 1}</text>
<text x="${width + 18}" y="35" font-family="sans-serif" font-size="24" fill="#172b3a">After — corrected placement</text>
<svg y="${headerHeight}" width="${width}" height="${height}" overflow="hidden">${reuseSheet(beforeSvg)}</svg>
<svg x="${width}" y="${headerHeight}" width="${width}" height="${height}" overflow="hidden">${reuseSheet(afterSvg)}</svg>
<g transform="translate(0 ${headerHeight + height})">${beforeText}</g>
<g transform="translate(${width} ${headerHeight + height})">${afterText}</g>
</g>`
    offset += rowHeight
    return result
  })
  const width = 1200
  const note = createAnalyzerTextSvg(input.note, width)
  const noteHeight = Number(note.match(/height="([\d.]+)"/)![1])
  const totalHeight = offset + noteHeight
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
<rect width="100%" height="100%" fill="white" />
<defs>${definitions.join("\n")}</defs>
${rows.join("\n")}
<g transform="translate(0 ${offset})">${note}</g>
</svg>`.replace(/[ \t]+$/gm, "")
}
