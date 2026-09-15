import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceMovementObstacle } from "../assets/trace-movement-obstacles"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("rejects a move blocked by other-connection", async () => {
  const circuitJson = await createTraceMovementObstacle("other-connection")
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis
      .getIssues()
      .filter(
        (issue) =>
          issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent",
      ),
  ).toHaveLength(0)
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
