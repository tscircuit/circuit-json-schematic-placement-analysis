import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseControllerSheetCircuitJson } from "../assets/wireless-mouse-controller-sheet"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces the complete wireless mouse controller sheet layout", () => {
  const analysis = analyzeSchematicPlacement(
    wirelessMouseControllerSheetCircuitJson,
  )

  const crystalPlacementIssue = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
    .find(
      (issue) => issue.lineItemType === "CrystalNotCenteredOverLoadCapacitors",
    )

  expect(crystalPlacementIssue).toMatchObject({
    lineItemType: "CrystalNotCenteredOverLoadCapacitors",
    crystalSchematicBox: { sourceComponentName: "X_HF_32M" },
    firstLoadCapacitorSchematicBox: {
      sourceComponentName: "C_HF_XC1",
    },
    secondLoadCapacitorSchematicBox: {
      sourceComponentName: "C_HF_XC2",
    },
    deltaSchX: 4.5,
    deltaSchY: -1.7,
    newSchX: -5.5,
    newSchY: -7.7,
  })

  const railIssues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues"
        ? item.issues.filter(
            (issue) => issue.lineItemType === "TwoPinComponentShouldBeVertical",
          )
        : [],
    )
  expect(railIssues).toMatchObject([
    { schematicBox: { sourceComponentName: "SW_RESET" }, railType: "ground" },
  ])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: wirelessMouseControllerSheetCircuitJson,
      analysis,
      width: 1800,
      height: 1100,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
