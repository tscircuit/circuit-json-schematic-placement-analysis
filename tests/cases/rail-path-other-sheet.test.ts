import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("rail path visibility: other-sheet", () => {
  const circuitJson = createRailPathRepro()
  for (const e of circuitJson)
    if (e.type === "schematic_net_label") e.schematic_sheet_id = "another-sheet"
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const issues = analysis.getIssues()
  expect(issues).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["RailPathTooSpreadOut"],
      width: 1100,
      height: 750,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
