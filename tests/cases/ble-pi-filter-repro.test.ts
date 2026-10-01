import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { blePiFilter as circuitJson } from "../assets/ble-pi-filter"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI LP-EM-CC2340R5-RGE sheet 1: C33–L33–C34 is the same 1.5pF–2.8nH–1.5pF filter.
// https://e2e.ti.com/cfs-file/__key/communityserver-discussions-components-files/538/lp_2D00_em_2D00_cc2340r5_2D00_rge_5F00_Schematic.pdf
test("preserves the scattered pi filter on the complete ble sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 13)
  expectReproNets(circuitJson, [
    ["C21_RF_FILTER_IN.pin1", "L2_RF_FILTER.pin1"],
    ["L2_RF_FILTER.pin2", "C22_RF_FILTER_OUT.pin1"],
    ["C21_RF_FILTER_IN.pin2", "C22_RF_FILTER_OUT.pin2", "net.GND"],
  ])
  expect(
    getReproSchematicComponent(circuitJson, "C21_RF_FILTER_IN").center,
  ).toEqual({ x: 6, y: 7 })
  expect(
    getReproSchematicComponent(circuitJson, "L2_RF_FILTER").center,
  ).toEqual({ x: 10, y: 3 })
  expect(
    getReproSchematicComponent(circuitJson, "C22_RF_FILTER_OUT").center,
  ).toEqual({ x: 14, y: 7 })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    }),
  ).toEqual([])
  const issueTypes = ["PiFilterComponentsNotGrouped"] as const
  const issues = analysis.getIssues({ issueTypes })
  expect(issues).toMatchObject([
    {
      inductorSchematicBox: { sourceComponentName: "L2_RF_FILTER" },
      firstCapacitorSchematicBox: { sourceComponentName: "C21_RF_FILTER_IN" },
      secondCapacitorSchematicBox: { sourceComponentName: "C22_RF_FILTER_OUT" },
    },
  ])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes,
    showFullSchematic: true,
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 1800,
    height: 1200,
  })
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((m) => Number(m[1])),
  ).toEqual(Array(3).fill(analysis.getIssues().indexOf(issues[0]!) + 1))
  expect([...svg.matchAll(/data-listing-issue-number="(\d+)"/g)]).toHaveLength(
    1,
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
