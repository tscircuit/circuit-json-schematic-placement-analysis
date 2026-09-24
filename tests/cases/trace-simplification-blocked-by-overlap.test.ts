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
  // The wider resistor bounds now overlap before any movement. Keep reporting
  // that overlap while rejecting the trace-simplifying move into R12.
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    lineItemType: "ComponentOverlap",
    firstComponent: { sourceComponentName: "R11", width: 0.9 },
    secondComponent: { sourceComponentName: "R12", width: 0.9 },
  })
  expect(analysis.toString()).toContain("<ComponentOverlap")
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
