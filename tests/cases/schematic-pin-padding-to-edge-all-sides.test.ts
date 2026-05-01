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

  expect(pinPaddingIssues).toHaveLength(8)

  for (const issue of pinPaddingIssues) {
    const expectedExcessPadding =
      issue.measuredPadding - issue.maxAllowedPadding
    expect(issue.excessPadding).toBeCloseTo(expectedExcessPadding, 10)

    if (issue.pinSide === "left" || issue.pinSide === "right") {
      const expectedSuggestedSchHeight =
        issue.schematicBox.height - expectedExcessPadding * 2
      expect(issue.suggestedSchHeight).toBeCloseTo(
        expectedSuggestedSchHeight,
        10,
      )
      expect(issue.suggestedSchWidth).toBeUndefined()
    } else {
      const expectedSuggestedSchWidth =
        issue.schematicBox.width - expectedExcessPadding * 2
      expect(issue.suggestedSchWidth).toBeCloseTo(expectedSuggestedSchWidth, 10)
      expect(issue.suggestedSchHeight).toBeUndefined()
    }
  }

  expect(
    pinPaddingIssues.map((issue) => ({
      pinSide: issue.pinSide,
      edgeSide: issue.edgeSide,
      maxAllowedPadding: issue.maxAllowedPadding,
      message: issue.message,
    })),
  ).toMatchObject([
    {
      pinSide: "left",
      edgeSide: "top",
      maxAllowedPadding: 0.6224999999999999,
      message:
        "Move schematic pins closer to the box edge or change the schematic box height",
    },
    {
      pinSide: "left",
      edgeSide: "bottom",
      maxAllowedPadding: 0.6224999999999999,
      message:
        "Move schematic pins closer to the box edge or change the schematic box height",
    },
    {
      pinSide: "right",
      edgeSide: "top",
      maxAllowedPadding: 0.6224999999999999,
      message:
        "Move schematic pins closer to the box edge or change the schematic box height",
    },
    {
      pinSide: "right",
      edgeSide: "bottom",
      maxAllowedPadding: 0.6224999999999999,
      message:
        "Move schematic pins closer to the box edge or change the schematic box height",
    },
    {
      pinSide: "top",
      edgeSide: "left",
      maxAllowedPadding: 0.385,
      message:
        "Move schematic pins closer to the box edge or change the schematic box width",
    },
    {
      pinSide: "top",
      edgeSide: "right",
      maxAllowedPadding: 0.385,
      message:
        "Move schematic pins closer to the box edge or change the schematic box width",
    },
    {
      pinSide: "bottom",
      edgeSide: "left",
      maxAllowedPadding: 0.385,
      message:
        "Move schematic pins closer to the box edge or change the schematic box width",
    },
    {
      pinSide: "bottom",
      edgeSide: "right",
      maxAllowedPadding: 0.385,
      message:
        "Move schematic pins closer to the box edge or change the schematic box width",
    },
  ])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
