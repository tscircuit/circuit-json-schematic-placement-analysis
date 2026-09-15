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

  expect(pinPaddingIssues).toHaveLength(1)
  const issue = pinPaddingIssues[0]!
  expect(issue.schematicBox.sourceComponentName).toBe("U3")
  expect(issue.suggestedSchHeight).toBeCloseTo(1, 10)
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
