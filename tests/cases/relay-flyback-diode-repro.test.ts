import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { relayFlybackController as circuitJson } from "../assets/relay-flyback-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// Toshiba's mechanical relay driver draws the diode beside and across the coil.
// https://toshiba-semicon-storage.com/info/docget.jsp?did=156465#page=12
test("records separated flyback diodes on the complete relay controller sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 16)
  expectReproNets(circuitJson, [
    ["D1.anode", "K1.COIL_A", "Q2.C"],
    ["D2.anode", "K2.COIL_A", "Q3.C"],
    ["D1.cathode", "D2.cathode", "K1.COIL_B", "K2.COIL_B", "J_ARD.pin4"],
  ])
  expect(getReproSchematicComponent(circuitJson, "D1").center.x).toBeCloseTo(
    -0.73,
  )
  expect(getReproSchematicComponent(circuitJson, "D1").center.y).toBeCloseTo(
    3.04,
  )
  expect(getReproSchematicComponent(circuitJson, "D2").center.x).toBeCloseTo(
    -2.47,
  )
  expect(getReproSchematicComponent(circuitJson, "D2").center.y).toBeCloseTo(
    -4.44,
  )
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((issue) => issue.lineItemType)).toEqual([
    "NetLabelCollision",
    "FlybackDiodeSeparatedFromRelayCoil",
    "FlybackDiodeSeparatedFromRelayCoil",
  ])
  const issues = analysis.getIssues({
    issueTypes: ["FlybackDiodeSeparatedFromRelayCoil"],
  })
  expect(issues).toMatchObject([
    {
      relaySchematicBox: { sourceComponentName: "K1" },
      diodeSchematicBox: { sourceComponentName: "D1" },
    },
    {
      relaySchematicBox: { sourceComponentName: "K2" },
      diodeSchematicBox: { sourceComponentName: "D2" },
    },
  ])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    showFullSchematic: true,
    issueTypes: ["FlybackDiodeSeparatedFromRelayCoil"],
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 2200,
    height: 1600,
  })
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((m) => Number(m[1])),
  ).toEqual([2, 2, 3, 3])
  expect(
    [...svg.matchAll(/data-listing-issue-number="(\d+)"/g)].map((m) =>
      Number(m[1]),
    ),
  ).toEqual([2, 3])
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
