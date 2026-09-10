import { stackSvgsVertically } from "stack-svgs"
import { getIssueSchematicSheetContext } from "lib/utils/issue-context"
import { createIssueOverlaySvg } from "./create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "./create-schematic-analysis-fixture-svg"

/** Keep reported issue counts and diagnostic text below the schematic. */
export function createIssueReproSnapshot(
  input: Parameters<typeof createIssueOverlaySvg>[0] & {
    /** Draw red numbered badges beside diagnostics instead of plain #number lines. */
    showListingIssueMarkers?: boolean
  },
) {
  const allIssues = input.analysis.getIssues()
  const issues = input.analysis
    .getIssues(input)
    .filter(
      (issue) =>
        input.issueIndex === undefined ||
        allIssues.indexOf(issue) === input.issueIndex,
    )
  const listedIssues = issues.map((issue) => ({
    number: allIssues.indexOf(issue) + 1,
    text: input.analysis.schematicIssuesToString(issue),
    sheetId: getIssueSchematicSheetContext(issue).schematicSheetId ?? "",
  }))
  const text = [
    "Emitted issue counts (all sheets):",
    ...Object.entries(input.analysis.getIssueCounts())
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`),
    `Selected type(s): ${input.issueTypes?.join(", ") ?? "all"}`,
    `Matching issues: ${issues.length}`,
    ...listedIssues.flatMap(({ number, text }) =>
      input.showListingIssueMarkers ? [text] : [`#${number}`, text],
    ),
  ].join("\n")
  return stackSvgsVertically(
    [
      // Keep the cropped SVG nested: stack-svgs otherwise stretches its viewBox
      // and lets off-frame schematic content spill into the analysis text.
      `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width ?? 1400}" height="${input.height ?? 900}">${createIssueOverlaySvg(input)}</svg>`,
      createAnalyzerTextSvg(
        text,
        input.width ?? 1400,
        input.showListingIssueMarkers ? listedIssues : [],
      ),
    ],
    { normalizeSize: false, gap: 0 },
  ).replace(/[ \t]+$/gm, "")
}
