import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceAnchoredNetLabelCollisionCircuitJson } from "../assets/trace-anchored-net-label-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test.failing("reports a collision with a net label anchored to a trace", () => {
  const circuitJson = createTraceAnchoredNetLabelCollisionCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)

  const issues = analysis.getLineItems().flatMap((lineItem) => {
    if (lineItem.lineItemType !== "SchematicPlacementIssues") return []
    return lineItem.issues
  })
  const netLabelCollisions = issues.filter(
    (issue) => issue.lineItemType === "NetLabelCollision",
  )

  expect(netLabelCollisions).toHaveLength(1)
})
