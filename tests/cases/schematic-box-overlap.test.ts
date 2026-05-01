import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createOverlappingSchematicBoxesCircuitJson } from "../assets/overlapping-schematic-boxes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic box overlap issue", async () => {
  const overlappingSchematicBoxesCircuitJson =
    await createOverlappingSchematicBoxesCircuitJson()
  const analysis = analyzeSchematicPlacement(
    overlappingSchematicBoxesCircuitJson,
  )
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const overlapIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "ComponentOverlap",
        )
      : []

  expect(overlapIssues).toMatchObject([
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
  ])

  expect(analysis.toString()).toContain(
    '<OverlapCorrectionSuggestion target="R2" newSchX="1.25" deltaSchX="+0.25" />',
  )
  expect(analysis.toString()).toContain(
    '<OverlapCorrectionSuggestion target="R2" newSchY="0.694" deltaSchY="+0.194" />',
  )
  expect(analysis.toString()).not.toContain("SchematicPinSpacingTooSmall")
  expect(analysis.toString()).not.toContain('deltaSchX="0"')
  expect(analysis.toString()).not.toContain('deltaSchY="0"')
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
