import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmPinPaddingBoxesResized } from "../assets/ti-tps25751evm-pin-padding-boxes-resized"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts the TI TPS25751EVM pin-margin boxes at their suggested widths", async () => {
  const circuitJson = await createTiTps25751EvmPinPaddingBoxesResized()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson)
  // Narrowing to the suggested widths leaves no box, label or padding issues.
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
