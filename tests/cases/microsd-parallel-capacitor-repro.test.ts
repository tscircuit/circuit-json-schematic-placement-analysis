import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMicroSdParallelCapacitorRepro } from "../assets/microsd-parallel-capacitors"
import { publishedPlacements } from "../assets/microsd-parallel-capacitors/published-placements"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete microSD sheet with inline parallel capacitors", async () => {
  const circuitJson = await createMicroSdParallelCapacitorRepro()
  expectReproRendered(circuitJson, 16)
  for (const [name, position] of Object.entries(publishedPlacements)) {
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x: position.schX,
      y: position.schY,
    })
  }
  expectReproNets(circuitJson, [
    ["net.VDD_3V3", "J_SD.pin4", "C_SD_HF.pin1", "C_SD_BULK.pin1"],
    ["net.GND", "J_SD.pin6", "C_SD_HF.pin2", "C_SD_BULK.pin2"],
    ["net.SD_DAT2", "J_SD.pin1", "TP_SD_DAT2.pin1", "R_SD_DAT2_PU.pin1"],
    ["net.SD_DAT3", "J_SD.pin2", "TP_SD_DAT3.pin1", "R_SD_DAT3_PU.pin1"],
    ["net.SD_CMD", "J_SD.pin3", "TP_SD_CMD.pin1", "R_SD_CMD_PU.pin1"],
    ["net.SD_CLK", "J_SD.pin5", "TP_SD_CLK.pin1"],
    ["net.SD_DAT0", "J_SD.pin7", "TP_SD_DAT0.pin1", "R_SD_DAT0_PU.pin1"],
    ["net.SD_DAT1", "J_SD.pin8", "TP_SD_DAT1.pin1", "R_SD_DAT1_PU.pin1"],
    ["net.SD_CARD_DETECT_N", "J_SD.pin9", "TP_SD_CD.pin1", "R_SD_CD_PU.pin1"],
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((issue) => issue.lineItemType)).toEqual([
    "ParallelCapacitorsDrawnInline",
    "ConnectorTestPointNotAligned",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1600,
      height: 1100,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
