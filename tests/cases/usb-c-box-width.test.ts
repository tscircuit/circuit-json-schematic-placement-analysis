import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import usbCircuit from "../assets/usb-c-box-width.circuit.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("USB-C artwork is not treated as empty space in a generic box", () => {
  // Reduced from the RP2040 motor controller's J_USB. Its built-in artwork
  // occupies the 1.525 units that the label-only heuristic calls empty.
  const circuitJson = usbCircuit as CircuitJson
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).not.toContain("GenericSchematicBoxTooWide")
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
