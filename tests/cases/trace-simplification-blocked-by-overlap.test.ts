import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceSimplificationCircuitJson } from "../assets/trace-simplification"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not suggest a trace-simplifying move that overlaps another component", async () => {
  const circuitJson = await createTraceSimplificationCircuitJson({
    addBlockingComponent: true,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )

  expect(
    issues.some(
      (issue) => issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent",
    ),
  ).toBe(false)
  expect(analysis.getLineItems()).toEqual([])
  expect(analysis.toString()).toBe("")
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
