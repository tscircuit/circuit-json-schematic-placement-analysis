import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import usbHubCrystalNetwork from "../assets/usb-hub-four-pin-crystal-network.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

// The USB2244 clock circuit uses one capacitor from each crystal signal to ground.
// https://ww1.microchip.com/downloads/aemDocuments/documents/UNG/ProductDocuments/DesignChecklist/USB2244-HW-Design-Checklist-00004319.pdf#page=8
test("records the real USB hub four-pin crystal load network", () => {
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
  expect(
    analysis.getIssues({
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
    }),
  ).toEqual([])

  // The crystal placement is valid, but C32's reference overlaps a net label.
  expect(analysis.getIssues()).toEqual([
    expect.objectContaining({
      lineItemType: "SchematicTextCollision",
      schematicSheetId: "schematic_sheet_2",
      schematicComponentId: "schematic_component_71",
      schematicTextId: "schematic_component_71:symbol-text:4",
      text: "C32",
      collidingObject: {
        type: "net_label",
        id: "schematic_net_label_113",
        text: "U13_XTAL2",
      },
      suggestedMove: undefined,
    }),
  ])
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
  expect(JSON.stringify(circuitJson)).toBe(original)
})
