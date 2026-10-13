import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import usbCircuit from "../assets/usb-c-box-width.circuit.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports safe size reductions for the motor controller's USB-C symbol", () => {
  // Real J_USB geometry is evaluated by the same pin-and-label bounds as chips.
  const circuitJson = usbCircuit as CircuitJson
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toMatchObject([
    {
      lineItemType: "GenericSchematicBoxTooWide",
      suggestedSchWidth: 1.6785714285714284,
    },
    {
      lineItemType: "SchematicPinPaddingToEdgeTooLarge",
      suggestedSchHeight: 3.95,
    },
  ])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
