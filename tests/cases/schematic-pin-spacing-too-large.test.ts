import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicPinSpacingTooLargeCircuitJson } from "../assets/schematic-pin-spacing"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic pin spacing too large issue", async () => {
  const schematicPinSpacingCircuitJson =
    await createSchematicPinSpacingTooLargeCircuitJson()
  const analysis = analyzeSchematicPlacement(schematicPinSpacingCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const pinSpacingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicPinSpacingTooLarge",
        )
      : []

  expect(pinSpacingIssues).toHaveLength(1)
  expect(pinSpacingIssues).toMatchObject([
    {
      lineItemType: "SchematicPinSpacingTooLarge",
      schematicBox: {
        sourceComponentName: "U4",
        width: 1.9000000000000001,
      },
      measuredSpacing: 0.3,
      maxAllowedSpacing: 0.25,
      message: "Decrease schematic pin spacing to 0.25",
    },
  ])

  expect(analysis.toString()).toContain(
    '<SchematicPinSpacingTooLarge message="Decrease schematic pin spacing to 0.25" componentName="U4" measuredSpacing="0.3" maxAllowedSpacing="0.25" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicPinSpacingCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
