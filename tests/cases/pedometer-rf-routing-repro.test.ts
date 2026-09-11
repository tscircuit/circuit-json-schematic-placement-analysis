import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { pedometerLogicCircuitJson as circuitJson } from "../assets/pedometer"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI LP-EM-CC2340R5-RGE, sheet 1: C33–L33–C34 and CA1 have the same roles/values.
// https://e2e.ti.com/cfs-file/__key/communityserver-discussions-components-files/538/lp_2D00_em_2D00_cc2340r5_2D00_rge_5F00_Schematic.pdf
test("preserves the RF wire crossing C22 on the complete published pedometer logic sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 28)
  expect(circuitJson.filter((e) => e.type === "source_component")).toHaveLength(
    52,
  )
  expectReproNets(circuitJson, [
    ["U1_MCU.ANT", "C21_RF_SHUNT1.pin1", "L2_RF_SERIES.pin1"],
    ["L2_RF_SERIES.pin2", "C22_RF_SHUNT2.pin1", "C24_RF_DC_BLOCK.pin1"],
    ["C24_RF_DC_BLOCK.pin2", "ANT1.FEED"],
    ["C21_RF_SHUNT1.pin2", "C22_RF_SHUNT2.pin2", "net.GND"],
  ])
  const cap = getReproSchematicComponent(circuitJson, "C22_RF_SHUNT2")
  const trace = circuitJson.find(
    (e) =>
      e.type === "schematic_trace" &&
      e.schematic_trace_id === "schematic_trace_47",
  )
  if (trace?.type !== "schematic_trace")
    throw new Error("Missing original RF route")
  expect(
    trace.edges.some(
      ({ from, to }) =>
        from.x === cap.center.x &&
        to.x === cap.center.x &&
        Math.min(from.y, to.y) < cap.center.y - cap.size.height / 2 &&
        Math.max(from.y, to.y) > cap.center.y + cap.size.height / 2,
    ),
  ).toBe(true)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const rfNames = [
    "C21_RF_SHUNT1",
    "L2_RF_SERIES",
    "C22_RF_SHUNT2",
    "C24_RF_DC_BLOCK",
    "ANT1",
  ]
  const placements = analysis
    .getLineItems()
    .filter((item) => item.lineItemType === "SchematicBoxPlacement")
  expect(
    placements.filter((p) => rfNames.includes(p.sourceComponentName ?? "")),
  ).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
