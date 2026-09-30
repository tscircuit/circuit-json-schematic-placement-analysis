import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { bldcGateNetwork as circuitJson } from "../assets/bldc-gate-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI DRV8351 EVM page 11: R33/R35 with Q1, R43/R45 with Q2, including floating sources.
// https://www.ti.com/lit/ug/slvucx2a/slvucx2a.pdf#page=11
test("records both separated gate networks on the complete BLDC PhaseA sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 8)
  expectReproNets(circuitJson, [
    ["R_GAH.pin2", "R_PDAH.pin1", "Q_AH.G"],
    ["R_PDAH.pin2", "Q_AH.S1", "Q_AH.S2", "Q_AH.S3", "net.PHASE_A"],
    ["R_GAL.pin2", "R_PDAL.pin1", "Q_AL.G"],
    ["R_PDAL.pin2", "Q_AL.S1", "Q_AL.S2", "Q_AL.S3", "net.SHUNT_A"],
  ])
  for (const [name, x, y] of [
    ["Q_AH", 0, 0],
    ["R_GAH", 0, -12],
    ["R_PDAH", 9, -12],
    ["Q_AL", 18, -12],
    ["R_GAL", 18, -24],
    ["R_PDAL", 0, -28],
  ] as const)
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_7",
      showFullSchematic: true,
      showOverlay: false,
      width: 2200,
      height: 1600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
