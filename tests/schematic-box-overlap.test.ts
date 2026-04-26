import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "./fixtures/create-schematic-analysis-fixture-svg"
import { overlappingSchematicBoxesCircuitJson } from "./fixtures/overlapping-schematic-boxes"

test("generates a schematic box overlap issue", async () => {
  const analysis = analyzeSchematicPlacement(
    overlappingSchematicBoxesCircuitJson,
  )
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  expect(issuesLineItem).toMatchObject({
    lineItemType: "SchematicPlacementIssues",
    issues: [
      {
        lineItemType: "SchematicBoxOverlap",
        firstSchematicBox: {
          positionAnchor: "center",
          schX: 0,
          schY: 0,
          width: 3,
          height: 2,
          schematicComponentId: "schematic_component_a",
        },
        secondSchematicBox: {
          positionAnchor: "center",
          schX: 1,
          schY: 0.5,
          width: 3,
          height: 2,
          schematicComponentId: "schematic_component_b",
        },
        overlapCenter: {
          schX: 0.5,
          schY: 0.25,
        },
        overlapWidth: 2,
        overlapHeight: 1.5,
      },
    ],
  })

  expect(analysis.toString()).toContain(
    '<SchematicBoxOverlap firstSchX="0" firstSchY="0" secondSchX="1" secondSchY="0.5" overlapCenterSchX="0.5" overlapCenterSchY="0.25" overlapWidth="2" overlapHeight="1.5" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: overlappingSchematicBoxesCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
