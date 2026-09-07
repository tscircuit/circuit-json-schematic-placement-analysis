import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseControllerSheetCircuitJson } from "../assets/wireless-mouse-controller-sheet"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces the complete wireless mouse controller sheet layout", () => {
  const analysis = analyzeSchematicPlacement(
    wirelessMouseControllerSheetCircuitJson,
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: wirelessMouseControllerSheetCircuitJson,
      analysis,
      width: 1800,
      height: 1100,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
