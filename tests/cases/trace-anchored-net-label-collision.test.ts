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

  expect(netLabelCollisions).toEqual([
    {
      lineItemType: "NetLabelCollision",
      schematicSheetId: "schematic_sheet_0",
      schematicSheetName: undefined,
      pairs: [{ comp1Name: "U3", comp2Name: "J_ETH" }],
      moves: [
        { componentName: "U3", newSchX: 0.47, newSchY: 0.8 },
        { componentName: "J_ETH", newSchX: 7.68, newSchY: 2.1 },
      ],
    },
  ])
})
