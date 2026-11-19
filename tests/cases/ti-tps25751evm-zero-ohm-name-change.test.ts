import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTiTps25751EvmZeroOhmNameChange } from "../assets/ti-tps25751evm-zero-ohm-name-change"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts the TI TPS25751EVM 0 ohm GPIO rename links drawn in line", async () => {
  const circuitJson = await createTiTps25751EvmZeroOhmNameChange()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["TwoPinComponentShouldBeVertical"],
  })
  // R68 is a 0 ohm link with no ground end, like its five neighbours; it
  // renames GPIO3 and is drawn in line, as TI draws it.
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
