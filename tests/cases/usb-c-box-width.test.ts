import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import usbCircuit from "../assets/usb-c-box-width.circuit.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("retains the motor controller's existing USB-C symbol dimensions", () => {
  // Real J_USB geometry is evaluated by the same pin-and-label bounds as chips.
  const circuitJson = usbCircuit as CircuitJson
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).not.toContain("GenericSchematicBoxTooWide")
  expect(
    analysis.getIssues({ issueTypes: ["SchematicPinPaddingToEdgeTooLarge"] }),
  ).toHaveLength(0)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
