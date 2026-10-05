import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("rail path visibility: renamed", () => {
  const circuitJson = createRailPathRepro()
  for (const e of circuitJson) {
    if (
      e.type === "source_component" ||
      e.type === "source_net" ||
      e.type === "source_port"
    )
      e.name = "unrelated-name"
    if (e.type === "schematic_net_label") e.text = "NOT_A_RAIL_NAME"
  }
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const issues = analysis.getIssues()
  expect(issues).toHaveLength(1)
  if (issues[0]?.lineItemType !== "RailPathTooSpreadOut")
    throw Error("Missing finding")
  expect(issues[0].message).toContain("unrelated-name.VBUS_VS_DISCH")
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
