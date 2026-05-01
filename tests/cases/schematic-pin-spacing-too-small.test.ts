import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicPinSpacingTooSmallCircuitJson } from "../assets/schematic-pin-spacing"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic pin spacing too small issue", async () => {
  const schematicPinSpacingCircuitJson =
    await createSchematicPinSpacingTooSmallCircuitJson()
  const analysis = analyzeSchematicPlacement(schematicPinSpacingCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const pinSpacingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicPinSpacingTooSmall",
        )
      : []

  expect(pinSpacingIssues).toHaveLength(1)
  expect(pinSpacingIssues).toMatchObject([
    {
      lineItemType: "SchematicPinSpacingTooSmall",
      schematicBox: {
        sourceComponentName: "U4",
        width: 1.9000000000000001,
      },
      measuredSpacing: 0.15,
      minAllowedSpacing: 0.2,
      message: "Increase schematic pin spacing to 0.2",
    },
  ])

  expect(analysis.toString()).toContain(
    '<SchematicPinSpacingTooSmall message="Increase schematic pin spacing to 0.2" componentName="U4" measuredSpacing="0.15" minAllowedSpacing="0.2" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicPinSpacingCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
