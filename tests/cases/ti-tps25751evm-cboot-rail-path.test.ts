import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmBuckOutputStage } from "../assets/ti-tps25751evm-buck-output-stage"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not follow the TI TPS25751EVM bootstrap pin into the buck power stage", async () => {
  const circuitJson = await createTiTps25751EvmBuckOutputStage()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  // C64 links U10.CBOOT to the SW node; the path no longer crosses it into
  // L7 and the output capacitors, which do not support the CBOOT pin.
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
