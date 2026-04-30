import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicBoxSizingPinHeaderCircuitJson } from "../assets/schematic-box-sizing-pin-header"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic box sizing issue for a pin header", async () => {
  const schematicBoxSizingPinHeaderCircuitJson =
    await createSchematicBoxSizingPinHeaderCircuitJson()
  const analysis = analyzeSchematicPlacement(
    schematicBoxSizingPinHeaderCircuitJson,
  )
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const boxSizingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicBoxTooWideForPinHeader",
        )
      : []

  expect(boxSizingIssues).toHaveLength(1)
  expect(boxSizingIssues).toMatchObject([
    {
      lineItemType: "SchematicBoxTooWideForPinHeader",
      schematicBox: {
        sourceComponentName: "JP2",
        width: 1.8000000000000003,
      },
      measuredInnerLabelHorizontalEmptySpace: 1.0350000000000001,
      maxAllowedInnerLabelHorizontalEmptySpace: 0.1,
      suggestedSchWidth: 0.8650000000000001,
      message: "Shrink schematic box width",
    },
  ])

  expect(analysis.toString()).toContain(
    '<SchematicBoxTooWideForPinHeader message="Shrink schematic box width" componentName="JP2" currentSchWidth="1.8" measuredInnerLabelHorizontalEmptySpace="1.035" maxAllowedInnerLabelHorizontalEmptySpace="0.1" suggestedSchWidth="0.865" />',
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicBoxSizingPinHeaderCircuitJson,
      analysis,
      height: 900,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
