import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPocketAudioDividerCapacitors } from "../assets/pocket-audio-divider-capacitors"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
test("reproduces the published pocket-audio-divider-capacitors network without changing its positions or connections", async () => {
  const j = await createPocketAudioDividerCapacitors()
  expectReproRendered(j, 6)
  const positions: Record<string, [number, number]> = {
    R_ATT_L1: [9.5, -15],
    R_ATT_L2: [13, -15],
    C_AMP_L: [6, -19],
    R_ATT_R1: [16.5, -15],
    R_ATT_R2: [20, -15],
    C_AMP_R: [9.5, -19],
  }
  for (const [name, xy] of Object.entries(positions))
    expect(getReproSchematicComponent(j, name).center).toEqual({
      x: xy[0],
      y: xy[1],
    })
  expectReproNets(j, [
    ["R_ATT_L1.pin1", "net.LINE_L"],
    ["R_ATT_L1.pin2", "R_ATT_L2.pin1", "C_AMP_L.pin1", "net.ATT_L"],
    ["C_AMP_L.pin2", "net.AMP_L"],
    ["R_ATT_R1.pin1", "net.LINE_R"],
    ["R_ATT_R1.pin2", "R_ATT_R2.pin1", "C_AMP_R.pin1", "net.ATT_R"],
    ["C_AMP_R.pin2", "net.AMP_R"],
    ["R_ATT_L2.pin2", "R_ATT_R2.pin2", "net.GND"],
  ])
  const analysis = analyzeSchematicPlacement(j)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "TwoPinComponentShouldBeVertical",
    "TwoPinComponentShouldBeVertical",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: j,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 650,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "network")
})
