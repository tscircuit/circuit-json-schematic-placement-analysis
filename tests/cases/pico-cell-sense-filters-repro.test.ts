import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { picoCellSenseFilters as circuitJson } from "../assets/pico-cell-sense-filters"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI BQ77915 Figure 9-11, page 28, draws the cell-input filters as an ordered ladder.
// https://www.ti.com/lit/ds/symlink/bq77915.pdf#page=28
// TI's lowest-cell capacitor returns to VSS; this board's C113 returns to VC0_F.
// Preserve that electrical difference and every original position/route in this repro.
test("records the scattered cell filters on the complete pico battery sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 33)
  expectReproNets(circuitJson, [
    ["U9.VC5", "U9.VC4", "U9.VC3", "R114.pin2", "C115.pin1"],
    ["U9.VC2", "R113.pin2", "C115.pin2", "C114.pin1"],
    ["U9.VC1", "R112.pin2", "C114.pin2", "C113.pin1"],
    ["U9.VC0", "R111.pin2", "C113.pin2", "C112.pin1"],
    ["U9.VSS", "R111.pin1", "C112.pin2", "net.BNEG"],
    ["R112.pin1", "net.BAL1"],
    ["R113.pin1", "net.BAL2"],
    ["R114.pin1", "net.BAL3"],
  ])
  for (const [name, x, y] of [
    ["U9", -10, 8],
    ["R111", -0.2, 0],
    ["R112", 4.4, 0],
    ["R113", 9, 0],
    ["R114", 13.6, 0],
    ["C112", -14, -2.8],
    ["C113", -9.4, -2.8],
    ["C114", -4.8, -2.8],
    ["C115", -0.2, -2.8],
  ] as const)
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((issue) => issue.lineItemType)).toEqual([
    "MosfetGateNetworkNotGrouped",
    "MosfetGateNetworkNotGrouped",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_6",
      showFullSchematic: true,
      showOverlay: false,
      width: 2400,
      height: 1700,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
