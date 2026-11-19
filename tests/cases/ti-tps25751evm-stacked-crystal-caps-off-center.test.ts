import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmStackedCrystalCaps } from "../assets/ti-tps25751evm-stacked-crystal-caps"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports a crystal moved off-center between stacked load capacitors", async () => {
  // Y1 is moved 1.2 below its TI position, close to C42.
  const circuitJson = await createTiTps25751EvmStackedCrystalCaps({
    crystalSchY: 6.69645,
  })
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
  })
  expect(analysis.getIssues()).toMatchObject([
    {
      crystalSchematicBox: { sourceComponentName: "Y1" },
      newSchX: -0.1,
      newSchY: 7.9,
      deltaSchY: 1.2,
    },
  ])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
