import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { growCabinetController as circuitJson } from "../assets/grow-cabinet-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI SLVA881 Figure 11 shows RTOP above the shared tap and RBOT below it.
// https://www.ti.com/lit/an/slva881/slva881.pdf#page=9
test("records reversed divider halves on the complete grow cabinet controller sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 24)
  expectReproNets(circuitJson, [
    ["R_DU1.pin1", "R_DU2.pin1", "net.V12"],
    ["R_DU1.pin2", "R_DL1.pin1", "C_D1.pin1", "net.DIM1_OUT"],
    ["R_DU2.pin2", "R_DL2.pin1", "C_D2.pin1", "net.DIM2_OUT"],
    ["R_DL1.pin2", "R_DL2.pin2", "C_D1.pin2", "C_D2.pin2", "net.GND"],
  ])
  for (const channel of [1, 2]) {
    const supply = getReproSchematicComponent(circuitJson, `R_DU${channel}`)
    const ground = getReproSchematicComponent(circuitJson, `R_DL${channel}`)
    expect(supply.symbol_name).toBe("boxresistor_down")
    expect(ground.symbol_name).toBe("boxresistor_down")
    expect(ground.center.y - supply.center.y).toBeGreaterThan(4)
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    }),
  ).toEqual([])
  const issues = analysis.getIssues({
    issueTypes: ["VoltageDividerSupplyResistorBelowGroundResistor"],
  })
  expect(
    issues.map(
      (issue) =>
        issue.lineItemType ===
          "VoltageDividerSupplyResistorBelowGroundResistor" && [
          issue.supplyResistorSchematicBox.sourceComponentName,
          issue.groundResistorSchematicBox.sourceComponentName,
        ],
    ),
  ).toEqual([
    ["R_DU1", "R_DL1"],
    ["R_DU2", "R_DL2"],
  ])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    showFullSchematic: true,
    issueTypes: ["VoltageDividerSupplyResistorBelowGroundResistor"],
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 1800,
    height: 1300,
  })
  const numbers = issues.map((issue) => analysis.getIssues().indexOf(issue) + 1)
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    ),
  ).toEqual(numbers.flatMap((number) => [number, number]))
  expect(
    [...svg.matchAll(/data-listing-issue-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    ),
  ).toEqual(numbers)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
