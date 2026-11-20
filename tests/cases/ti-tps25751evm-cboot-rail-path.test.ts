import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmBuckOutputStage } from "../assets/ti-tps25751evm-buck-output-stage"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports the TI TPS25751EVM bootstrap pin's path through the buck power stage", async () => {
  const circuitJson = await createTiTps25751EvmBuckOutputStage()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  // Current behavior: from U10.CBOOT the path crosses the bootstrap capacitor
  // to the SW node, then L7 and the output capacitor C66, and is reported.
  expect(analysis.getIssues()).toMatchObject([
    {
      hostSchematicBox: { sourceComponentName: "U10" },
      sourcePortName: "CBOOT",
      railType: "ground",
      supportSchematicBoxes: [
        { sourceComponentName: "C64" },
        { sourceComponentName: "L7" },
        { sourceComponentName: "C66" },
      ],
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
