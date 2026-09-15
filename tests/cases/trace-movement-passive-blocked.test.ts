import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPassiveTraceMovement } from "../assets/passive-trace-movement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not prefer a passive move that collides with another component", async () => {
  const circuitJson = await createPassiveTraceMovement("R1", true)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const moves = analysis.getIssues({
    issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
  })
  expect(moves).toHaveLength(1)
  expect(moves[0]).toMatchObject({
    targetComponent: { sourceComponentName: "U1" },
    suggestedTurnCount: 1,
  })
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
