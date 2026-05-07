import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createCircuitJson } from "../assets/diode-resistor-misaligned"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("plain diode misaligned with resistor — same X, different Y, trace has corners", async () => {
  const circuitJson = await createCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
