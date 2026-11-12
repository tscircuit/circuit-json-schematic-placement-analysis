import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { macroSixPowerSheet } from "../assets/macro-six-v015-power"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("macro-six rail paths recommend moving support components when none exist", () => {
  const analysis = analyzeSchematicPlacement(macroSixPowerSheet, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const directRailIssues = analysis
    .getIssues()
    .filter(
      (issue) =>
        issue.lineItemType === "RailPathTooSpreadOut" &&
        issue.supportSchematicBoxes.length === 0,
    )
  expect(directRailIssues).toHaveLength(2)
  expect(
    directRailIssues
      .map((issue) =>
        issue.lineItemType === "RailPathTooSpreadOut"
          ? issue.hostSchematicBox.sourceComponentName
          : undefined,
      )
      .sort(),
  ).toEqual(["ISP", "SW_POWER"])
  for (const issue of directRailIssues) {
    if (issue.lineItemType !== "RailPathTooSpreadOut")
      throw new Error("Expected rail path")
    expect(issue.schematicTraceIds.length).toBeGreaterThan(0)
    expect(issue.pathSpan).toBeGreaterThan(issue.maxRecommendedSpan)
    // Record the current misleading advice; a fix should update this expectation.
    expect(issue.message).toContain(
      "move the connected support elements closer",
    )
    expect(
      createIssueReproSnapshot({
        circuitJson: macroSixPowerSheet,
        analysis,
        issueIndex: analysis.getIssues().indexOf(issue),
        issueTypes: ["RailPathTooSpreadOut"],
      }),
    ).toMatchSvgSnapshot(
      import.meta.path,
      issue.hostSchematicBox.sourceComponentName,
    )
  }
})
