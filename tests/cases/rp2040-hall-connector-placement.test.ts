import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("highlights the connector detours on the complete hall sheet", () => {
  const circuitJson = getRp2040BldcSheet("hall")
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "ConnectorPositionCausesTraceDetours",
    )
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    connectorSchematicBox: { sourceComponentName: "J_HALL" },
    evaluatedSignalCount: 3,
    newSchX: -13.3,
    newSchY: 0.2,
    currentTotalSignalDistance: 64.7,
    suggestedTotalSignalDistance: 15.6,
  })
  expect(issues[0]!.schematicTraceIds).toHaveLength(2)
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes: ["ConnectorPositionCausesTraceDetours"],
    showFullSchematic: true,
    width: 1800,
    height: 1200,
  })
  expect(
    new Set(
      [...svg.matchAll(/data-issue-type="([^"]+)"/g)].map((match) => match[1]),
    ),
  ).toEqual(new Set(["ConnectorPositionCausesTraceDetours"]))
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
