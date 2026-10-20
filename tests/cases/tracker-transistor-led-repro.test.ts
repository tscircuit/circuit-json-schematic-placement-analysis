import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTrackerTransistorLed } from "../assets/tracker-transistor-led"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
test("reproduces the tracker-transistor-led with original positions and pin connections", async () => {
  const json = await createTrackerTransistorLed()
  expectReproRendered(json, 4)
  for (const [name, x, y] of [
    ["Q2", 11, -21.5],
    ["R20", 7.5, -22.175],
    ["LED4", 14, -21.5],
    ["R16", 14, -19],
  ] as const)
    expect(getReproSchematicComponent(json, name).center).toEqual({ x, y })
  expectReproNets(json, [
    ["R20.pin1", "net.U7_NETLIGHT"],
    ["R20.pin2", "Q2.base"],
    ["Q2.emitter", "net.GND"],
    ["Q2.collector", "LED4.cathode"],
    ["LED4.anode", "R16.pin1"],
    ["R16.pin2", "net.VSYS"],
  ])
  for (const [name, pin, direction] of [
    ["Q2", "collector", "left"],
    ["LED4", "cathode", "up"],
  ] as const) {
    const id = getReproSourcePort(json, name, pin).source_port_id
    expect(
      json.find((e) => e.type === "schematic_port" && e.source_port_id === id),
    ).toMatchObject({ facing_direction: direction })
  }
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "TransistorLedNotAligned",
    "TransistorResistorNotAligned",
    "TwoPinComponentHasInvertedRails",
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
