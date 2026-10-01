import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stridePiFilter as circuitJson } from "../assets/stride-pi-filter"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI LP-EM-CC2340R5-RGE sheet 1: C33–L33–C34 is the same 1.5pF–2.8nH–1.5pF filter.
// https://e2e.ti.com/cfs-file/__key/communityserver-discussions-components-files/538/lp_2D00_em_2D00_cc2340r5_2D00_rge_5F00_Schematic.pdf
test("preserves the scattered pi filter on the complete stride sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 78)
  expectReproNets(circuitJson, [
    ["C26.pin1", "L2.pin1"],
    ["L2.pin2", "C27.pin1"],
    ["C26.pin2", "C27.pin2", "net.GND"],
  ])
  expect(getReproSchematicComponent(circuitJson, "C26").center).toEqual({
    x: 30,
    y: -28,
  })
  expect(getReproSchematicComponent(circuitJson, "L2").center).toEqual({
    x: 6,
    y: -44,
  })
  expect(getReproSchematicComponent(circuitJson, "C27").center).toEqual({
    x: 36,
    y: -28,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    }),
  ).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
