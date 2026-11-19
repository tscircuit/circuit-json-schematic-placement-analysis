import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmStackedCrystalCaps } from "../assets/ti-tps25751evm-stacked-crystal-caps"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getReproSchematicComponent } from "../fixtures/placement-repro-assertions"

test("accepts the TI TPS25751EVM crystal centered between stacked load capacitors", async () => {
  const circuitJson = await createTiTps25751EvmStackedCrystalCaps()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const crystal = getReproSchematicComponent(circuitJson, "Y1")
  const upper = getReproSchematicComponent(circuitJson, "C41")
  const lower = getReproSchematicComponent(circuitJson, "C42")
  // Y1 sits halfway between the stacked capacitors and within 0.2 of their
  // horizontal centers, as in the TI drawing.
  expect(crystal.center.y).toBeCloseTo((upper.center.y + lower.center.y) / 2, 2)
  expect(Math.abs(crystal.center.x - upper.center.x)).toBeLessThan(0.25)

  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
  })
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
