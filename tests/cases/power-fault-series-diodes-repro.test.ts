import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPowerFaultSeriesDiodes } from "../assets/power-fault-series-diodes"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reproduces the published power-fault input clamp with unchanged symbols, positions and polarity", async () => {
  const j = await createPowerFaultSeriesDiodes()
  expectReproRendered(j, 3)
  for (const [name, x, y] of [
    ["J1", 0.1175000000000006, -9.59999999999999],
    ["D302", 3.0966471000000007, -9.500512299999992],
    ["D303", 2.6916471000000004, -11.316103899999991],
  ] as const)
    expect(getReproSchematicComponent(j, name).center).toEqual({ x, y })
  for (const name of ["D302", "D303"])
    expect(getReproSchematicComponent(j, name).symbol_name).toBe(
      "zener_diode_right",
    )
  expectReproNets(j, [
    ["J1.pin1", "D302.pin1", "net.AIN1_RAW"],
    ["J1.pin2", "D303.pin1", "net.HILCOM"],
    ["D302.pin2", "D303.pin2", "net.TVSMID1"],
  ])
  const analysis = analyzeSchematicPlacement(j)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "SeriesDiodesNotAligned",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: j,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1200,
      height: 750,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "clamp")
})
