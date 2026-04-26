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
        lineItemType: "SchematicBoxOverlap",
        firstSchematicBox: {
          positionAnchor: "center",
          schX: 0,
          schY: 0,
          sourceComponentId: "source_component_0",
          sourceComponentName: "U1",
          schematicComponentId: "schematic_component_0",
        },
        secondSchematicBox: {
          positionAnchor: "center",
          schX: 1,
          schY: 0.5,
          sourceComponentId: "source_component_1",
          sourceComponentName: "R2",
          schematicComponentId: "schematic_component_1",
        },
      },
    ],
  })

  expect(analysis.toString()).toContain(
    '<SchematicBoxOverlap component1Name="U1" component2Name="R2" component1SchematicComponentId="schematic_component_0" component2SchematicComponentId="schematic_component_1"',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: overlappingSchematicBoxesCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
