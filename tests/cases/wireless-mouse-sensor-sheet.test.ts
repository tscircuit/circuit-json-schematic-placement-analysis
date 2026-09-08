import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseSensorSheetCircuitJson } from "../assets/wireless-mouse-sensor-sheet"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces the complete wireless mouse sensor sheet layout", () => {
  const analysis = analyzeSchematicPlacement(
    wirelessMouseSensorSheetCircuitJson,
  )
  const flipIssues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
    .filter((issue) => issue.lineItemType === "TwoPinComponentCouldBeFlipped")

  expect(
    flipIssues.map((issue) => ({
      componentName: issue.targetComponent.sourceComponentName,
      connectedComponentName: issue.connectedComponent.sourceComponentName,
      targetPin: issue.targetPin,
      currentFacingDirection: issue.currentFacingDirection,
      suggestedFacingDirection: issue.suggestedFacingDirection,
      deltaSchRotation: issue.deltaSchRotation,
      currentTurnCount: issue.currentTurnCount,
      suggestedTurnCount: issue.suggestedTurnCount,
    })),
  ).toEqual([
    {
      componentName: "R_SPI_MOSI",
      connectedComponentName: "U_SENSOR",
      targetPin: "pin2",
      currentFacingDirection: "right",
      suggestedFacingDirection: "left",
      deltaSchRotation: 180,
      currentTurnCount: 2,
      suggestedTurnCount: 1,
    },
    {
      componentName: "R_SPI_SCLK",
      connectedComponentName: "U_SENSOR",
      targetPin: "pin2",
      currentFacingDirection: "right",
      suggestedFacingDirection: "left",
      deltaSchRotation: 180,
      currentTurnCount: 2,
      suggestedTurnCount: 1,
    },
  ])

  const railIssues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
    .filter((issue) => issue.lineItemType === "RailResistorShouldBeVertical")
  expect(
    railIssues.map((issue) => [
      issue.resistorSchematicBox.sourceComponentName,
      issue.railType,
    ]),
  ).toEqual([
    ["R_SENSOR_LED", "power"],
    ["R_SENSOR_RESET", "power"],
  ])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: wirelessMouseSensorSheetCircuitJson,
      analysis,
      width: 1800,
      height: 1100,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
