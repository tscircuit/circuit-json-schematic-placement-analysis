import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicPinPaddingToEdgeCircuitJson } from "../assets/schematic-pin-padding-to-edge"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic pin padding to edge issue", async () => {
  const schematicPinPaddingToEdgeCircuitJson =
    await createSchematicPinPaddingToEdgeCircuitJson()
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
      pinSide: "right",
      edgeSide: "top",
      pinName: "RUN",
      schematicBox: {
        sourceComponentName: "U3",
        width: 1,
      },
      measuredPadding: 1.2,
      maxAllowedPadding: 0.2,
      message:
        "Move schematic pins closer to the box edge or change the schematic box height",
    },
    {
      lineItemType: "SchematicPinPaddingToEdgeTooLarge",
      pinSide: "right",
      edgeSide: "bottom",
      pinName: "DVDD",
      schematicBox: {
        sourceComponentName: "U3",
        width: 1,
      },
      measuredPadding: 1.2,
      maxAllowedPadding: 0.2,
      message:
        "Move schematic pins closer to the box edge or change the schematic box height",
    },
  ])

  expect(analysis.toString()).toContain(
    '<SchematicPinPaddingToEdgeTooLarge message="Move schematic pins closer to the box edge or change the schematic box height" componentName="U3" pinSide="right" edgeSide="top" pinName="RUN" measuredPadding="1.2" maxAllowedPadding="0.2" />',
  )
  expect(analysis.toString()).toContain(
    '<SchematicPinPaddingToEdgeTooLarge message="Move schematic pins closer to the box edge or change the schematic box height" componentName="U3" pinSide="right" edgeSide="bottom" pinName="DVDD" measuredPadding="1.2" maxAllowedPadding="0.2" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicPinPaddingToEdgeCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
