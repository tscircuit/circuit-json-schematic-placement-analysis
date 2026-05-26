import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createCircuitJson } from "../assets/component-label-overlap"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("detects component label overlapping adjacent component box", async () => {
  const circuitJson = await createCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
