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

  expect(pinPaddingIssues).toHaveLength(1)
  const issue = pinPaddingIssues[0]!
  expect(issue.schematicBox.sourceComponentName).toBe("U4")
  expect(issue.suggestedSchWidth).toBeCloseTo(1, 10)
  expect(issue.paddingDetails).toHaveLength(2)
  for (const detail of issue.paddingDetails!) {
    expect(detail.excessPadding).toBeCloseTo(1, 10)
    expect(detail.maxAllowedPadding).toBeCloseTo(0.2, 10)
  }
  expect(
    analysis.toString().match(/<SchematicPinPaddingToEdgeTooLarge /g),
  ).toHaveLength(1)

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: schematicPinPaddingToEdgeCircuitJson,
      analysis,
      highlightIssues: ["SchematicPinPaddingToEdgeTooLarge"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
