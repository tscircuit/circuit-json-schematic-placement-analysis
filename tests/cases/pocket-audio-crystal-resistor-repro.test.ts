import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPocketAudioClock } from "../assets/pocket-audio-clock"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete audio-player Clock sheet with a separated crystal resistor", async () => {
  const circuitJson = await createPocketAudioClock()
  expectReproRendered(circuitJson, 5)
  for (const [name, x, y] of [
    ["U1", 31, 23],
    ["Y1", 38, 23],
    ["R_XOUT", 31, 15],
    ["C_XIN", 34.5, 15],
    ["C_XOUT", 38, 15],
  ] as const)
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  expectReproNets(circuitJson, [
    ["net.XIN", "U1.pin20", "Y1.pin1", "C_XIN.pin1"],
    ["net.XOUT", "U1.pin21", "R_XOUT.pin1"],
    ["net.XTAL_OUT", "R_XOUT.pin2", "Y1.pin3", "C_XOUT.pin1"],
    ["net.GND", "Y1.pin2", "Y1.pin4", "C_XIN.pin2", "C_XOUT.pin2"],
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "RailPathTooSpreadOut",
    "ResistorSeparatedFromCrystal",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1400,
      height: 1000,
      schematicSheetId: circuitJson.find((e) => e.type === "schematic_sheet")!
        .schematic_sheet_id,
      viewportBounds: { left: 28.5, right: 44, bottom: 13.5, top: 25.1 },
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
