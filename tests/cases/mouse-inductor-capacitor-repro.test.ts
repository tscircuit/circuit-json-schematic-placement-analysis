import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMouseInductorCapacitor } from "../assets/mouse-inductor-capacitor"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
test("reproduces mouse-inductor-capacitor from the published board", async () => {
  const json = await createMouseInductorCapacitor()
  expectReproRendered(json, 3)
  for (const [name, x, y] of [
    ["C_ANT_SHUNT", 9, -9],
    ["L_ANT_SERIES", 12, -7],
    ["ANT_BLE", 15, -6.8],
  ] as const) {
    const center = getReproSchematicComponent(json, name).center
    expect(center.x).toBeCloseTo(x, 6)
    expect(center.y).toBeCloseTo(y, 6)
  }
  expectReproNets(json, [
    ["L_ANT_SERIES.pin2", "C_ANT_SHUNT.pin1", "ANT_BLE.pin1"],
    ["C_ANT_SHUNT.pin2", "net.GND"],
    ["L_ANT_SERIES.pin1", "net.RF1"],
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
