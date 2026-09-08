import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseSensorSheetCircuitJson } from "../assets/wireless-mouse-sensor-sheet"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces the complete wireless mouse sensor sheet layout", () => {
  const analysis = analyzeSchematicPlacement(
    wirelessMouseSensorSheetCircuitJson,
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: wirelessMouseSensorSheetCircuitJson,
      analysis,
      width: 1800,
      height: 1100,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
