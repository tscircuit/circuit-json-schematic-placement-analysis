import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicPinPaddingToEdgeAllSidesCircuitJson } from "../assets/schematic-pin-padding-to-edge-all-sides"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates schematic pin padding to edge issues for labels on all sides", async () => {
  const circuitJson = await createSchematicPinPaddingToEdgeAllSidesCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
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
  expect(issue.paddingDetails).toHaveLength(8)
  expect(
    new Set(issue.paddingDetails!.map((detail) => detail.pinSide)),
  ).toEqual(new Set(["left", "right", "top", "bottom"]))
  for (const detail of issue.paddingDetails!) {
    expect(detail.excessPadding).toBeCloseTo(
      detail.measuredPadding - detail.maxAllowedPadding,
      10,
    )
  }
  expect(issue.suggestedSchWidth).toBeCloseTo(0.97, 10)
  expect(issue.suggestedSchHeight).toBeCloseTo(1.445, 10)
  expect(issue.message).toEndWith("width and height")
  expect(
    analysis.toString().match(/<SchematicPinPaddingToEdgeTooLarge /g),
  ).toHaveLength(1)

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicPinPaddingToEdgeTooLarge"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
