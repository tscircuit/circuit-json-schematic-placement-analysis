import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceSimplificationCircuitJson } from "../assets/trace-simplification"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("suggests moving R11 right to remove an avoidable trace turn", async () => {
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
    schematicTraceId: "schematic_trace_r11",
    targetComponent: { sourceComponentName: "R11" },
    deltaSchX: 1,
    deltaSchY: 0,
    newSchX: 5,
    newSchY: 2,
    currentTurnCount: 2,
    suggestedTurnCount: 1,
  })
  expect(simplificationIssue?.message).toContain("move R11 right by 1")
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
