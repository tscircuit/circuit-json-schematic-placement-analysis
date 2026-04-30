import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicBoxSizingCircuitJson } from "../assets/schematic-box-sizing"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates schematic box sizing issues", async () => {
  const schematicBoxSizingCircuitJson =
    await createSchematicBoxSizingCircuitJson()
  const analysis = analyzeSchematicPlacement(schematicBoxSizingCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const boxSizingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicBoxTooWide",
        )
      : []

  expect(boxSizingIssues).toHaveLength(1)
  expect(boxSizingIssues).toMatchObject([
    {
      lineItemType: "SchematicBoxTooWide",
      schematicBox: {
        sourceComponentName: "JP2",
        width: 1.8000000000000003,
      },
      measuredGap: 1.0350000000000001,
      maxAllowedGap: 0.1,
      suggestedWidth: 0.8650000000000001,
      message: "Shrink schematic box width",
    },
  ])

  expect(analysis.toString()).toContain(
    '<SchematicBoxTooWide message="Shrink schematic box width" componentName="JP2" width="1.8" measuredGap="1.035" maxAllowedGap="0.1" suggestedWidth="0.865" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicBoxSizingCircuitJson,
      analysis,
      height: 900,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
