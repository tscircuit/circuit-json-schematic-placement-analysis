import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMicroSdConnectorTestPoint } from "../assets/microsd-connector-testpoint"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
test("reproduces microsd-connector-testpoint from the published board", async () => {
  const json = await createMicroSdConnectorTestPoint()
  expectReproRendered(json, 2)
  for (const [name, x, y] of [
    ["J_SD", 0, 0],
    ["TP_SD_CLK", -7.73375, -4.4],
  ] as const) {
    const center = getReproSchematicComponent(json, name).center
    expect(center.x).toBeCloseTo(x, 6)
    expect(center.y).toBeCloseTo(y, 6)
  }
  expectReproNets(json, [
    ["J_SD.pin5", "TP_SD_CLK.pin1", "net.SD_CLK"],
    ["J_SD.pin4", "net.VDD_3V3"],
    [
      "J_SD.pin6",
      "J_SD.pin10",
      "J_SD.pin11",
      "J_SD.pin12",
      "J_SD.pin13",
      "net.GND",
    ],
  ])
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "ConnectorTestPointNotAligned",
  ])
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
