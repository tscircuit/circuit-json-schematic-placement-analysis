import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("missing display names never expose internal identities in diagnostics", () => {
  const circuitJson = createRailPathRepro()
  for (const element of circuitJson) {
    if (element.type === "source_component") element.name = ""
    if (element.type === "source_port") element.name = ""
    if (element.type === "schematic_port") element.display_pin_label = undefined
  }
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const issue = analysis.getIssues()[0]
  if (issue?.lineItemType !== "RailPathTooSpreadOut")
    throw Error("Missing finding")
  expect(issue.message).toContain("component.pin18")
  expect(issue.message).not.toContain(issue.sourcePortId)
  const displayed = analysis.schematicIssuesToString(issue)
  expect(displayed).not.toContain(issue.sourcePortId)
  expect(displayed).not.toContain("sourcePortId=")
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
