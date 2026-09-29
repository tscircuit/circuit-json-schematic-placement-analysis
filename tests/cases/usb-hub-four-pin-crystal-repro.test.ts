import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { usbHubBoard as circuitJson } from "../assets/usb-hub-board"
import {
  createIssueOverlaySvg,
  getReproSheets,
} from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

// The USB2244 clock circuit uses one capacitor from each crystal signal to ground.
// https://ww1.microchip.com/downloads/aemDocuments/documents/UNG/ProductDocuments/DesignChecklist/USB2244-HW-Design-Checklist-00004319.pdf#page=8
test("records the unreported four-pin crystal networks on the complete USB hub", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 80)
  expect(getReproSheets(circuitJson).map((sheet) => sheet.name)).toEqual([
    "Upstream and Power",
    "Downstream Ports",
    "SD Reader",
    "Reserved Hub Ports",
  ])
  expectReproNets(circuitJson, [
    ["U1.XTAL1", "Y1.XTAL_A", "R4.pin1", "C3.pin1"],
    ["U1.XTAL2", "Y1.XTAL_B", "R4.pin2", "C4.pin1"],
    ["U13.XTAL1", "Y2.XTAL_A", "R33.pin1", "C31.pin1"],
    ["U13.XTAL2", "Y2.XTAL_B", "R33.pin2", "C32.pin1"],
    [
      "Y1.GND1",
      "Y1.GND2",
      "C3.pin2",
      "C4.pin2",
      "Y2.GND1",
      "Y2.GND2",
      "C31.pin2",
      "C32.pin2",
      "net.GND",
    ],
  ])

  for (const crystalName of ["Y1", "Y2"]) {
    const crystal = circuitJson.find(
      (element) =>
        element.type === "source_component" && element.name === crystalName,
    )
    if (crystal?.type !== "source_component") {
      throw new Error(`Missing crystal ${crystalName}`)
    }
    expect(crystal).toMatchObject({
      type: "source_component",
      ftype: "simple_chip",
      manufacturer_part_number: "TAXM24M4RFBCCT2T",
    })
    expect(
      circuitJson.filter(
        (element) =>
          element.type === "source_port" &&
          element.source_component_id === crystal.source_component_id,
      ),
    ).toHaveLength(4)
  }

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
    }),
  ).toEqual([])

  const input = {
    circuitJson,
    analysis,
    schematicSheetId: "schematic_sheet_2",
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors"] as const,
    showFullSchematic: true,
    showOverlay: false,
    width: 1800,
    height: 1300,
  }
  expect(createIssueOverlaySvg(input)).not.toContain("data-issue-index=")
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(
    import.meta.path,
    "full-sheet",
  )
  expect(JSON.stringify(circuitJson)).toBe(original)
})
