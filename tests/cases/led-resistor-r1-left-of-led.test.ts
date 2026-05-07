import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createCircuitJson } from "../assets/led-resistor-r1-left-of-led"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("misaligned — R1 to the left of D1, cathode points away from resistor", async () => {
  const circuitJson = await createCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
