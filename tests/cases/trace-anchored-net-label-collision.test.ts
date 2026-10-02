import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTraceAnchoredNetLabelCollisionCircuitJson } from "../assets/trace-anchored-net-label-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports a collision with a net label anchored to a trace", () => {
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
  expect(netLabelCollisions[0]!.pairs).toEqual([
    { comp1Name: "J_ETH", comp2Name: "label RTL_VDD_1V0" },
  ])
  expect(netLabelCollisions[0]!.moves).toEqual([])
  expect(netLabelCollisions[0]!.message).toContain("label positions")
})
