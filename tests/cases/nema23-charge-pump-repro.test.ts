import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { nema23ChargePump as circuitJson } from "../assets/nema23-charge-pump"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI draws the 100nF capacitor directly beside CPL/CPH in Figure 8-1.
// https://www.ti.com/lit/ds/symlink/drv8462.pdf#page=101
test("preserves the separated charge-pump capacitor on the complete NEMA23 driver sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 18)
  expectReproNets(circuitJson, [
    ["C_CP.pin1", "DRIVER.CPH"],
    ["C_CP.pin2", "DRIVER.CPL"],
  ])
  expect(getReproSchematicComponent(circuitJson, "C_CP").center).toEqual({
    x: 3,
    y: 9,
  })
  expect(getReproSchematicComponent(circuitJson, "DRIVER").center).toEqual({
    x: 0,
    y: 0,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toEqual([])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    schematicSheetId: "schematic_sheet_3",
    showFullSchematic: true,
    showOverlay: false,
    width: 1800,
    height: 1200,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
