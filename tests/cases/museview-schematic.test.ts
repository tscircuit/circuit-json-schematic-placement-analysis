import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { museviewCircuitJson as circuitJson } from "../assets/museview"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("preserves the published Museview schematic as a four-sheet regression fixture", () => {
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(60)
  expect(circuitJson.filter((e) => e.type === "source_trace")).toHaveLength(237)
  expect(
    circuitJson.filter((e) => e.type === "schematic_sheet").map((e) => e.name),
  ).toEqual(["usb", "power", "mcu", "camera"])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1600,
      height: 1000,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
