import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceSimplificationCircuitJson } from "../assets/trace-simplification"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("suggests moving R11 right to remove two avoidable trace turns", async () => {
  const circuitJson = await createTraceSimplificationCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
  const simplificationIssue = issues.find(
    (issue) => issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent",
  )

  expect(simplificationIssue).toMatchObject({
    schematicTraceId: "schematic_trace_0",
    targetComponent: { sourceComponentName: "R11" },
    deltaSchX: 0.8,
    deltaSchY: 0,
    newSchX: 0.8,
    newSchY: 2,
    currentTurnCount: 3,
    suggestedTurnCount: 1,
  })
  expect(simplificationIssue?.message).toContain("move R11 right by 0.8")
  expect(
    analysis
      .getLineItems()
      .filter((lineItem) => lineItem.lineItemType === "SchematicBoxPlacement")
      .map((placement) => placement.sourceComponentName),
  ).toEqual(["U3", "R11"])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
