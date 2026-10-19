import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createPeltierSeriesRc,
  peltierRcPlacements,
} from "../assets/peltier-series-rc"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the separated series RC branch from Peltier v0.4.3", async () => {
  const circuitJson = await createPeltierSeriesRc()
  expectReproRendered(circuitJson, 3)
  expectReproNets(circuitJson, [
    ["net.DRIVER_COMP", "R_COMP.pin1", "C_COMP_POLE.pin1"],
    ["R_COMP.pin2", "C_COMP_ZERO.pin1"],
    ["net.GND", "C_COMP_ZERO.pin2", "C_COMP_POLE.pin2"],
  ])
  expect(circuitJson.filter((e) => e.type === "source_port")).toHaveLength(6)
  for (const [name, [x, y]] of Object.entries(peltierRcPlacements)) {
    const part = getReproSchematicComponent(circuitJson, name)
    expect(part.center.x).toBeCloseTo(x, 6)
    expect(part.center.y).toBeCloseTo(y, 6)
    expect(part.symbol_name).toBe(
      name === "R_COMP" ? "boxresistor_right" : "capacitor_down",
    )
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1200,
      height: 900,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
