import { stackSvgsVertically } from "stack-svgs"
import { createIssueOverlaySvg } from "./create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "./create-schematic-analysis-fixture-svg"

/** Keep diagnostic text below the schematic, including counts for zero-issue types. */
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
    ...Object.entries(input.analysis.getIssueCounts()).map(
      ([type, count]) => `${type}: ${count}`,
    ),
    `Selected type(s): ${input.issueTypes?.join(", ") ?? "all"}`,
    `Matching issues: ${issues.length}`,
    ...issues.flatMap((issue) => [
      `#${input.analysis.getIssues().indexOf(issue) + 1}`,
      input.analysis.schematicIssuesToString(issue),
    ]),
  ].join("\n")
  return stackSvgsVertically(
    [
      createIssueOverlaySvg(input),
      createAnalyzerTextSvg(text, input.width ?? 1400),
    ],
    { normalizeSize: false, gap: 0 },
  ).replace(/[ \t]+$/gm, "")
}
