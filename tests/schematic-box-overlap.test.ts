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
        correctionSuggestions: [
          {
            targetComponentName: "R2",
            deltaSchX: 0.2500000000000001,
            deltaSchY: 0,
            newSchX: 1.25,
            newSchY: 0.5,
          },
          {
            targetComponentName: "R2",
            deltaSchX: 0,
            deltaSchY: 0.19445534999999947,
            newSchX: 1,
            newSchY: 0.6944553499999995,
          },
        ],
      },
    ],
  })

  expect(analysis.toString()).toContain(
    '<OverlapCorrectionSuggestion target="R2" newSchX="1.25" newSchY="0.5" deltaSchX="+0.25" deltaSchY="0" />',
  )
  expect(analysis.toString()).toContain(
    '<OverlapCorrectionSuggestion target="R2" newSchX="1" newSchY="0.694" deltaSchX="0" deltaSchY="+0.194" />',
  )
  expect(analysis.toString()).not.toContain(
    '<OverlapCorrectionSuggestion target="U1"',
  )
  expect(analysis.toString()).not.toContain("overlapCenterSch")
  expect(analysis.toString()).not.toContain("source_component_")
  expect(analysis.toString()).not.toContain("schematic_component_")

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: overlappingSchematicBoxesCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
