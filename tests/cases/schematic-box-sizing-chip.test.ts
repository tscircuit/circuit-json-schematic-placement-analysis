import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicBoxSizingChipCircuitJson } from "../assets/schematic-box-sizing-chip"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic box sizing issue for a chip", async () => {
  const schematicBoxSizingChipCircuitJson =
    await createSchematicBoxSizingChipCircuitJson()
  const analysis = analyzeSchematicPlacement(schematicBoxSizingChipCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const boxSizingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicBoxTooWideForChip",
        )
      : []

  expect(boxSizingIssues).toHaveLength(1)
  expect(boxSizingIssues).toMatchObject([
    {
      lineItemType: "SchematicBoxTooWideForChip",
      schematicBox: {
        sourceComponentName: "U2",
        width: 3,
      },
      measuredInnerLabelHorizontalEmptySpace: 2.1399999999999997,
      maxAllowedInnerLabelHorizontalEmptySpace: 1,
      suggestedSchWidth: 1.8600000000000003,
      message: "Shrink schematic box width",
    },
  ])

  expect(analysis.toString()).toContain(
    '<SchematicBoxTooWideForChip message="Shrink schematic box width" componentName="U2" currentSchWidth="3" measuredInnerLabelHorizontalEmptySpace="2.14" maxAllowedInnerLabelHorizontalEmptySpace="1" suggestedSchWidth="1.86" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicBoxSizingChipCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
