import { stackSvgsVertically } from "stack-svgs"
import { createIssueOverlaySvg } from "./create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "./create-schematic-analysis-fixture-svg"

/** Keep reported issue counts and diagnostic text below the schematic. */
export function createIssueReproSnapshot(
  input: Parameters<typeof createIssueOverlaySvg>[0],
) {
  const issues = input.analysis
    .getIssues(input)
    .filter(
      (issue) =>
        input.issueIndex === undefined ||
        input.analysis.getIssues().indexOf(issue) === input.issueIndex,
    )
  const text = [
    "Emitted issue counts (all sheets):",
    ...Object.entries(input.analysis.getIssueCounts())
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`),
    `Selected type(s): ${input.issueTypes?.join(", ") ?? "all"}`,
    `Matching issues: ${issues.length}`,
    ...issues.flatMap((issue) => [
      `#${input.analysis.getIssues().indexOf(issue) + 1}`,
      input.analysis.schematicIssuesToString(issue),
    ]),
  ].join("\n")
  return stackSvgsVertically(
    [
      // Keep the cropped SVG nested: stack-svgs otherwise stretches its viewBox
      // and lets off-frame schematic content spill into the analysis text.
      `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width ?? 1400}" height="${input.height ?? 900}">${createIssueOverlaySvg(input)}</svg>`,
      createAnalyzerTextSvg(text, input.width ?? 1400),
    ],
    { normalizeSize: false, gap: 0 },
  ).replace(/[ \t]+$/gm, "")
}
