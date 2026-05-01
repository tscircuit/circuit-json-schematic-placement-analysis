import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicBoxSizingGenericCircuitJson } from "../assets/schematic-box-sizing-generic"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a schematic box sizing issue for a generic connector", async () => {
  const schematicBoxSizingGenericCircuitJson =
    await createSchematicBoxSizingGenericCircuitJson()
  const analysis = analyzeSchematicPlacement(schematicBoxSizingGenericCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const boxSizingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "GenericSchematicBoxTooWide",
        )
      : []

  expect(boxSizingIssues).toHaveLength(1)
  expect(boxSizingIssues).toMatchObject([
    {
      lineItemType: "GenericSchematicBoxTooWide",
      schematicBox: {
        sourceComponentName: "U3",
        width: 4.4,
      },
      measuredInnerLabelHorizontalEmptySpace: 3.6350000000000007,
      maxAllowedInnerLabelHorizontalEmptySpace: 1,
      suggestedSchWidth: 1.7649999999999997,
      message: "Shrink schematic box width",
    },
  ])

  expect(analysis.toString()).toContain(
    '<GenericSchematicBoxTooWide message="Shrink schematic box width" componentName="U3" currentSchWidth="4.4" measuredInnerLabelHorizontalEmptySpace="3.635" maxAllowedInnerLabelHorizontalEmptySpace="1" suggestedSchWidth="1.765" />',
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicBoxSizingGenericCircuitJson,
      analysis,
      height: 900,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
