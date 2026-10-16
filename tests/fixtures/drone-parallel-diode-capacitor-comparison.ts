import type { CircuitJson } from "circuit-json"
import type { SchematicPlacementAnalysis } from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"

const issueTypes = ["ParallelDiodeCapacitorNotAligned"] as const
type State = { circuitJson: CircuitJson; analysis: SchematicPlacementAnalysis }

/** Equal-scale views of every complete motor block, plus a separate detail view. */
export function createDroneParallelComparison(
  before: State,
  after: State,
  detail = false,
) {
  const issues = before.analysis.getIssues({ issueTypes })
  if (issues.length !== 4 || after.analysis.getIssues().length)
    throw new Error(
      "Expected four original pairs and a completely clean corrected sheet",
    )
  const cellWidth = detail ? 900 : 600,
    cellHeight = detail ? 620 : 415
  const columns = detail ? 1 : 2,
    rows = detail ? 1 : 2
  const panelWidth = cellWidth * columns,
    circuitHeight = cellHeight * rows
  const width = panelWidth * 2,
    height = circuitHeight + 170
  const escape = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  const scope = (svg: string, prefix: string) =>
    svg
      .replace(/\sid="([^"]+)"/g, ` id="${prefix}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
      .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`)
  const panels = [before, after]
    .map((state, side) => {
      const views = (detail ? [1] : [1, 2, 3, 4])
        .map((n, i) => {
          const x = side ? -20 + ((n - 1) % 2) * 14 : -20 + (n - 1) * 20
          const y = side ? -9 * Math.floor((n - 1) / 2) : 0
          const svg = renderIssueOverlay({
            ...state,
            issueTypes,
            issueIndex:
              side === 0
                ? before.analysis.getIssues().indexOf(issues[n - 1]!)
                : undefined,
            showOverlay: side === 0,
            showIssueGeometry: false,
            width: cellWidth,
            height: cellHeight,
            viewportBounds: {
              left: x - (side ? 6.5 : 5.5),
              right: x + (side ? 9 : 10),
              bottom: y + (side ? -39 : -40.5),
              top: y + (side ? -28.5 : -30),
            },
          }).svg
          return `<svg x="${(i % columns) * cellWidth}" y="${45 + Math.floor(i / columns) * cellHeight}" width="${cellWidth}" height="${cellHeight}" overflow="hidden">${scope(svg, `motor-${n}-${side}`)}</svg>`
        })
        .join("\n")
      const diagnostics = side
        ? [
            detail
              ? "Diode and capacitor form compact parallel branches."
              : "All four diode/capacitor pairs form compact parallel branches.",
            "Full-sheet analysis: 0 reported issues.",
          ]
        : (detail ? issues.slice(0, 1) : issues).map((issue) => {
            if (issue.lineItemType !== issueTypes[0])
              throw new Error("Unexpected issue")
            const n = before.analysis.getIssues().indexOf(issue) + 1
            return `${n}. ${issue.diodeSchematicBox.sourceComponentName} / ${issue.capacitorSchematicBox.sourceComponentName}: staggered, with shared nets at opposite ends.`
          })
      return `<g transform="translate(${side * panelWidth} 0)"><text x="18" y="30" font-family="sans-serif" font-size="24" fill="#172b3a">${side ? "After" : "Before"} — ${detail ? "motor 1" : "four motor blocks (sectional views)"}</text>${views}${diagnostics.map((line, i) => `<text x="18" y="${circuitHeight + 73 + i * 24}" font-family="sans-serif" font-size="18" fill="#b91c1c">${escape(line)}</text>`).join("")}</g>`
    })
    .join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><rect y="45" width="${width}" height="${circuitHeight}" fill="#f5f1ed"/>${panels}<line x1="${panelWidth}" x2="${panelWidth}" y1="0" y2="${height}" stroke="#9ca3af" stroke-width="2"/></svg>`
}
