import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTrackerTransistorResistor } from "../assets/tracker-transistor-resistor"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reproduces the tracker transistor network with its original positions and connections", async () => {
  const json = await createTrackerTransistorResistor()
  expectReproRendered(json, 3)
  for (const [name, x, y] of [
    ["Q1", 8, -17],
    ["R12", 4, -17.675],
    ["R13", 8, -15],
  ] as const)
    expect(getReproSchematicComponent(json, name).center).toEqual({ x, y })
  expectReproNets(json, [
    ["R12.pin1", "net.U5_IO4"],
    ["R12.pin2", "Q1.base"],
    ["Q1.emitter", "net.GND"],
    ["Q1.collector", "R13.pin1", "net.U7_PWRKEY"],
    ["R13.pin2", "net.VSYS"],
  ])
  for (const [name, pin, direction] of [
    ["R12", "pin2", "right"],
    ["Q1", "base", "down"],
  ] as const) {
    const id = getReproSourcePort(json, name, pin).source_port_id
    expect(
      json.find((e) => e.type === "schematic_port" && e.source_port_id === id),
    ).toMatchObject({ facing_direction: direction })
  }
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "TwoPinComponentShouldBeVertical",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 850,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "network")
})
