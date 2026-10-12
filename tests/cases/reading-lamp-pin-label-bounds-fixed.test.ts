import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createReadingLampPinLabelBoundsCircuitJson } from "../assets/reading-lamp-pin-label-bounds"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts the reading-lamp chip after applying the suggested height", async () => {
  const circuitJson = await createReadingLampPinLabelBoundsCircuitJson(2.55)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toEqual([])
  const box = circuitJson.find((e) => e.type === "schematic_component")!
  for (const port of circuitJson.filter((e) => e.type === "schematic_port")) {
    expect(
      box.size.height / 2 - Math.abs(port.center.y - box.center.y) - 0.075,
    ).toBeGreaterThanOrEqual(0.1 - 1e-9)
  }
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
