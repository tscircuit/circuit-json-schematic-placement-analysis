import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createWireTextCollisionCircuitJson } from "../assets/wire-text-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("reports one text/trace collision even when several segments cross the text", async () => {
  const circuitJson = await createWireTextCollisionCircuitJson()
  const trace = circuitJson.find((e) => e.type === "schematic_trace")
  if (trace?.type !== "schematic_trace") throw new Error("Missing wire")
  // Split the same straight wire into two equivalent segments at its midpoint.
  const edge = trace.edges[0]!
  const middle = {
    x: (edge.from.x + edge.to.x) / 2,
    y: (edge.from.y + edge.to.y) / 2,
  }
  trace.edges = [
    { from: edge.from, to: middle },
    { from: middle, to: edge.to },
  ]
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = getPlacementIssues(analysis).filter(
    (e) => e.lineItemType === "SchematicTextCollision",
  )
  expect(issues).toHaveLength(1)
  expect(issues[0]!.collidingObject).toMatchObject({
    type: "trace",
    id: trace.schematic_trace_id,
  })
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
