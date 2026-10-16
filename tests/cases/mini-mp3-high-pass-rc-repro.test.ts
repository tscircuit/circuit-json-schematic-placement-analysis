import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createMiniMp3Headphones,
  headphonePlacements,
} from "../assets/mini-mp3-headphones"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces both separated capacitor/resistor pairs in the complete MP3 headphone block", async () => {
  const circuitJson = await createMiniMp3Headphones()
  expectReproRendered(circuitJson, 11)
  expect(circuitJson.filter((e) => e.type === "source_port")).toHaveLength(24)
  expectReproNets(circuitJson, [
    [
      "net.GND",
      "J4.pin1",
      "J4.pin4",
      "R25.pin2",
      "R26.pin2",
      "C33.pin2",
      "C34.pin2",
      "C35.pin2",
    ],
    ["net.HP_L", "J4.pin2", "C43.pin2", "R25.pin1"],
    ["net.HP_R", "J4.pin3", "C44.pin2", "R26.pin1"],
    ["net.LEFT", "C43.pin1", "R19.pin1"],
    ["net.RIGHT", "C44.pin1", "R20.pin1"],
    ["net.GBUF", "R18.pin1"],
    ["net.GBUF_Z", "R18.pin2", "C33.pin1"],
    ["net.LEFT_Z", "R19.pin2", "C34.pin1"],
    ["net.RIGHT_Z", "R20.pin2", "C35.pin1"],
  ])
  for (const [name, [x, y]] of Object.entries(headphonePlacements))
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "TwoPinComponentCouldBeFlipped",
    "HighPassRcFilterComponentsNotGrouped",
    "HighPassRcFilterComponentsNotGrouped",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1400,
      height: 900,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
