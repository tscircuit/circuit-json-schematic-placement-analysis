import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { smartSwitchGateNetwork as circuitJson } from "../assets/smart-switch-gate-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI DRV8351 EVM page 11 groups the series and gate-source resistors beside each FET.
// https://www.ti.com/lit/ug/slvucx2a/slvucx2a.pdf#page=11
test("records the separated gate network on the complete smart-switch sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 14)
  expectReproNets(circuitJson, [
    ["R2.pin2", "R3.pin1", "Q1.G"],
    ["R3.pin2", "Q1.S", "net.GND"],
    ["R2.pin1", "net.RELAY_EN"],
    ["Q1.D", "net.RELAY_LOW"],
  ])
  for (const [name, x, y] of [
    ["R2", -6, -2],
    ["R3", -5, -1],
    ["Q1", 4.77, 0],
  ] as const)
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((issue) => issue.lineItemType)).toEqual([
    "TwoPinComponentShouldBeVertical",
    "TwoPinComponentShouldBeVertical",
    "TwoPinComponentShouldBeVertical",
    "DecouplingCapacitorsNotCloseTogether",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      showFullSchematic: true,
      showOverlay: false,
      width: 2200,
      height: 1600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
