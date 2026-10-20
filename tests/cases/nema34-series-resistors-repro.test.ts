import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema34SeriesResistors } from "../assets/nema34-series-resistors"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
test("reproduces the published nema34-series-resistors network without changing its positions or connections", async () => {
  const j = await createNema34SeriesResistors()
  expectReproRendered(j, 4)
  const positions: Record<string, [number, number]> = {
    R31: [7.42, -3.45],
    R32: [10.75, -4.45],
    R33: [9.55, -6.25],
    C24: [11.25, -7.95],
  }
  for (const [name, xy] of Object.entries(positions))
    expect(getReproSchematicComponent(j, name).center).toEqual({
      x: xy[0],
      y: xy[1],
    })
  expectReproNets(j, [
    ["R31.pin1", "net.VMOTOR"],
    ["R31.pin2", "R32.pin1", "net.VMON_MID"],
    ["R32.pin2", "R33.pin1", "C24.pin1", "net.VMON_ADC"],
    ["R33.pin2", "C24.pin2", "net.GND"],
  ])
  for (const name of ["VMON_MID", "VMON_ADC"]) {
    const net = j.find((e) => e.type === "source_net" && e.name === name)
    if (net?.type !== "source_net") throw new Error("missing divider node")
    expect(net.is_power).not.toBe(true)
    expect(net.is_positive_voltage_source).not.toBe(true)
  }
  const analysis = analyzeSchematicPlacement(j)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: j,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 800,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "network")
})
