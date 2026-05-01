import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicPinPaddingToEdgeHorizontalCircuitJson } from "../assets/schematic-pin-padding-to-edge-horizontal"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic pin padding to edge width message", async () => {
  const schematicPinPaddingToEdgeCircuitJson =
    await createSchematicPinPaddingToEdgeHorizontalCircuitJson()
  const analysis = analyzeSchematicPlacement(
    schematicPinPaddingToEdgeCircuitJson,
  )
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const pinPaddingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
        )
      : []

  expect(pinPaddingIssues).toHaveLength(2)
  expect(pinPaddingIssues).toMatchObject([
    {
      lineItemType: "SchematicPinPaddingToEdgeTooLarge",
      pinSide: "top",
      edgeSide: "left",
      excessPadding: 1,
      suggestedSchWidth: 1,
      maxAllowedPadding: 0.2,
      message:
        "Move schematic pins closer to the box edge or change the schematic box width",
    },
    {
      lineItemType: "SchematicPinPaddingToEdgeTooLarge",
      pinSide: "top",
      edgeSide: "right",
      excessPadding: 1,
      suggestedSchWidth: 1,
      maxAllowedPadding: 0.2,
      message:
        "Move schematic pins closer to the box edge or change the schematic box width",
    },
  ])

  expect(analysis.toString()).toContain(
    'message="Move schematic pins closer to the box edge or change the schematic box width" componentName="U4" pinSide="top" edgeSide="left" pinName="RUN" measuredPadding="1.2" maxAllowedPadding="0.2" excessPadding="1" suggestedSchWidth="1"',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicPinPaddingToEdgeCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
