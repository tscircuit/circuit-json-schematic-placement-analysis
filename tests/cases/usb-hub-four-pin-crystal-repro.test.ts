import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createCorrectedUsbHubCrystalNetwork } from "../assets/usb-hub-four-pin-crystal-corrected"
import usbHubCrystalNetwork from "../assets/usb-hub-four-pin-crystal-network.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

// The USB2244 clock circuit uses one capacitor from each crystal signal to ground.
// https://ww1.microchip.com/downloads/aemDocuments/documents/UNG/ProductDocuments/DesignChecklist/USB2244-HW-Design-Checklist-00004319.pdf#page=8
test("records the real USB hub four-pin crystal load network", async () => {
  const circuitJson = usbHubCrystalNetwork as CircuitJson
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 5)
  expectReproNets(circuitJson, [
    ["U13.XTAL1", "Y2.XTAL_A", "R33.pin1", "C31.pin1"],
    ["U13.XTAL2", "Y2.XTAL_B", "R33.pin2", "C32.pin1"],
    ["Y2.GND1", "Y2.GND2", "C31.pin2", "C32.pin2", "net.GND"],
  ])

  const crystal = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "Y2",
  )
  if (crystal?.type !== "source_component") {
    throw new Error("Missing crystal Y2")
  }
  expect(crystal).toMatchObject({
    ftype: "simple_crystal",
    frequency: 24_000_000,
    load_capacitance: 12e-12,
    pin_variant: "four_pin",
    manufacturer_part_number: "TAXM24M4RFBCCT2T",
  })
  expect(
    circuitJson.filter(
      (element) =>
        element.type === "source_port" &&
        element.source_component_id === crystal.source_component_id,
    ),
  ).toHaveLength(4)
  expect(
    circuitJson.find(
      (element) =>
        element.type === "schematic_component" &&
        element.source_component_id === crystal.source_component_id,
    ),
  ).toMatchObject({ symbol_name: "crystal_4pin_right" })

  const analysis = analyzeSchematicPlacement(circuitJson)
  const crystalPlacementIssues = analysis.getIssues({
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
  })
  expect(crystalPlacementIssues).toHaveLength(1)
  expect(crystalPlacementIssues[0]).toMatchObject({
    crystalSchematicBox: { sourceComponentName: "Y2" },
    firstLoadCapacitorSchematicBox: { sourceComponentName: "C32" },
    secondLoadCapacitorSchematicBox: { sourceComponentName: "C31" },
    deltaSchX: -0.95,
    deltaSchY: 0,
    newSchX: 0.66,
    newSchY: 2.2,
  })
  expect(
    analysis.getIssues({ issueTypes: ["SchematicBoxInnerLabelCollision"] }),
  ).toMatchObject([
    {
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox: { sourceComponentName: "U13" },
      overlappingSides: ["left", "right"],
      message: "Inner labels are colliding. Increase the schWidth.",
    },
  ])
  expect(analysis.getIssues()).toHaveLength(2)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
      showOverlay: true,
      width: 1200,
      height: 700,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "focused")

  const correctedCircuitJson = await createCorrectedUsbHubCrystalNetwork()
  expectReproRendered(correctedCircuitJson, 5)
  const correctedAnalysis = analyzeSchematicPlacement(correctedCircuitJson)
  expect(
    correctedAnalysis.getIssues({
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
    }),
  ).toEqual([])
  expect(correctedAnalysis.getIssues()).toEqual([])
  expectReproNets(correctedCircuitJson, [
    ["U13.XTAL1", "Y2.pin1", "R33.pin1", "C31.pin1"],
    ["U13.XTAL2", "Y2.pin3", "R33.pin2", "C32.pin1"],
    ["Y2.pin2", "Y2.pin4", "C31.pin2", "C32.pin2", "net.GND"],
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: correctedCircuitJson,
      analysis: correctedAnalysis,
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
      showOverlay: true,
      width: 1200,
      height: 700,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "corrected")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
