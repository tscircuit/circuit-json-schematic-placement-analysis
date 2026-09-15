import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceMovementObstacle } from "../assets/trace-movement-obstacles"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("allows obstacles on another sheet", async () => {
  const circuitJson = await createTraceMovementObstacle("other-sheet")
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis
      .getIssues()
      .filter(
        (issue) =>
          issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent",
      ),
  ).toHaveLength(1)
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
