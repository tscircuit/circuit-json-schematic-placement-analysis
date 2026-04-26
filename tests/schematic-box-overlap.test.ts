import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "./fixtures/create-schematic-analysis-fixture-svg"
import { createOverlappingSchematicBoxesCircuitJson } from "./fixtures/overlapping-schematic-boxes"

test("generates a schematic box overlap issue", async () => {
  const overlappingSchematicBoxesCircuitJson =
    await createOverlappingSchematicBoxesCircuitJson()
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
        lineItemType: "ComponentOverlap",
        firstComponent: {
          positionAnchor: "center",
          schX: 0,
          schY: 0,
          sourceComponentName: "U1",
        },
        secondComponent: {
          positionAnchor: "center",
          schX: 1,
          schY: 0.5,
          sourceComponentName: "R2",
        },
      },
    ],
  })

  expect(analysis.toString()).toContain(
    '<ComponentOverlap component1Name="U1" component2Name="R2"',
  )
  expect(analysis.toString()).not.toContain("source_component_")
  expect(analysis.toString()).not.toContain("schematic_component_")

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: overlappingSchematicBoxesCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
