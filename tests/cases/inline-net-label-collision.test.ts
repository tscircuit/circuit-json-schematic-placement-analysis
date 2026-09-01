import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createInlineNetLabelCollisionCircuitJson } from "../assets/inline-net-label-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports a collision with a net label anchored to a trace", () => {
  const circuitJson = createInlineNetLabelCollisionCircuitJson()
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
