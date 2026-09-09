import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  getTrellisCoreSheetCircuitJson,
  trellisCoreCircuitJson,
} from "../assets/trellis-core"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces Trellis Core's published CPU decoupling layout before grouping fixes", () => {
  const original = JSON.stringify(trellisCoreCircuitJson)
  expectReproRendered(trellisCoreCircuitJson, 92)
  expect(
    trellisCoreCircuitJson
      .filter((element) => element.type === "schematic_sheet")
      .map((sheet) => sheet.name),
  ).toEqual(["power", "cpu-core", "cpu-io", "storage", "usb"])

  const circuitJson = getTrellisCoreSheetCircuitJson("cpu-core")
  expectReproRendered(circuitJson, 40)
  const caps = (first: number, last: number, pin: number) =>
    Array.from(
      { length: last - first + 1 },
      (_, i) => `C${first + i}.pin${pin}`,
    )
  expectReproNets(circuitJson, [
    ["net.P3V3", ...caps(9, 15, 1)],
    ["net.P1V8", ...caps(16, 21, 1), "C34.pin1", "C35.pin1"],
    ["net.P0V9", ...caps(22, 27, 1)],
    ["net.P1V5", ...caps(28, 31, 1)],
    ["net.GND", ...caps(9, 31, 2), "C34.pin2", "C35.pin2"],
  ])

  // Preserve the reviewed placement: the P3V3 bank spans 12 schematic units;
  // P1V8 also has C34/C35 in a separate cluster below C16–C21.
  for (const [name, x, y] of [
    ["C9", -12, 8],
    ["C15", 0, 8],
    ["C16", 2, 8],
    ["C21", 12, 8],
    ["C34", 5, 5],
    ["C35", 7, 5],
  ] as const) {
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y,
    })
  }

  const analysis = analyzeSchematicPlacement(circuitJson)
  // These are current reports, not the desired grouping behavior. The analyzer
  // does not implement DecouplingCapacitorsNotCloseTogether yet.
  expect(
    Object.entries(analysis.getIssueCounts()).filter(([, count]) => count > 0),
  ).toEqual([
    ["TraceCanBeSimplifiedByMovingComponent", 3],
    ["CrystalNotCenteredOverLoadCapacitors", 1],
    ["TwoPinComponentShouldBeVertical", 5],
  ])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1200,
    }).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(trellisCoreCircuitJson)).toBe(original)
})
