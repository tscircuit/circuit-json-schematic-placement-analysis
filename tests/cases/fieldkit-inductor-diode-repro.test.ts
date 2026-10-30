import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createFieldkitInductorDiode } from "../assets/fieldkit-inductor-diode"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the published Fieldkit inductor-diode junction around U10", async () => {
  const json = await createFieldkitInductorDiode()
  expectReproRendered(json, 3)
  for (const [name, x, y] of [
    ["U10", 0, 0],
    ["L2", 0, 2.5329125],
    ["D3", -2.885, -1.44375],
  ] as const) {
    const b = getReproSchematicComponent(json, name)
    expect(b.center.x).toBeCloseTo(x, 6)
    expect(b.center.y).toBeCloseTo(y, 6)
  }
  expectReproNets(json, [
    ["U10.SW", "L2.pin2", "D3.anode", "net.OLED_SW"],
    ["U10.VIN", "U10.EN", "L2.pin1", "net.V5"],
    ["D3.cathode", "net.OLED_12V"],
    ["U10.GND", "net.GND"],
    ["U10.FB", "net.OLED_FB"],
  ])
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 750,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "junction")
})
