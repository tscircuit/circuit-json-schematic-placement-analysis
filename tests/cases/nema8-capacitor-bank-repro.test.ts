import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema8CapacitorBank } from "../assets/nema8-capacitor-bank"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
test("reproduces nema8-capacitor-bank from the published board", async () => {
  const json = await createNema8CapacitorBank()
  expectReproRendered(json, 4)
  for (const [name, x, y] of [
    ["C_MCU_HF", 10, 4.5],
    ["C_MCU_BULK", 10, 3.0],
    ["C_TEMP", 10, 1.5],
    ["C_STATUS", 10, 0.0],
  ] as const) {
    const center = getReproSchematicComponent(json, name).center
    expect(center.x).toBeCloseTo(x, 6)
    expect(center.y).toBeCloseTo(y, 6)
  }
  expectReproNets(json, [
    [
      "C_MCU_HF.pin1",
      "C_MCU_BULK.pin1",
      "C_TEMP.pin1",
      "C_STATUS.pin1",
      "net.VIO",
    ],
    [
      "C_MCU_HF.pin2",
      "C_MCU_BULK.pin2",
      "C_TEMP.pin2",
      "C_STATUS.pin2",
      "net.GND",
    ],
  ])
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 650,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "network")
})
