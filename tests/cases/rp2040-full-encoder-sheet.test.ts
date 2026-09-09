import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// The same connector/filter arrangement as the Hall sheet, with A/B/Z channels.
// Keep the actual full sheet: the outer A/Z routes and labeled B route differ.
test("suggests moving the full encoder sheet connector to face its filters", () => {
  const circuitJson = getRp2040BldcSheet("encoder")
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(10)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    PinHeaderSchematicBoxTooWide: 1,
    ConnectorPositionCausesTraceDetours: 1,
  })
  const input = {
    circuitJson,
    analysis,
    issueTypes: ["ConnectorPositionCausesTraceDetours" as const],
    showFullSchematic: true,
    width: 1800,
    height: 1200,
  }
  expect(
    analysis.getIssues({
      issueTypes: [
        "TraceCanBeSimplifiedByMovingComponent",
        "TwoPinComponentCouldBeFlipped",
      ],
    }),
  ).toEqual([])
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "ConnectorPositionCausesTraceDetours",
    )
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    connectorSchematicBox: { sourceComponentName: "J_ENCODER" },
    evaluatedSignalCount: 3,
    newSchX: -13.3,
    newSchY: 0.2,
    currentTotalSignalDistance: 64.7,
    suggestedTotalSignalDistance: 15.6,
  })
  expect(issues[0]!.schematicTraceIds).toHaveLength(2)
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
