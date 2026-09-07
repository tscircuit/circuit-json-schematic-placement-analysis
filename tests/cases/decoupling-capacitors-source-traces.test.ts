import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorsNotCloseCircuitJson } from "../assets/decoupling-capacitors-not-close"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("follows source traces through the IC when connectivity keys are absent", async () => {
  const circuitJson = await createDecouplingCapacitorsNotCloseCircuitJson()
  for (const element of circuitJson) {
    if ("subcircuit_connectivity_map_key" in element)
      delete element.subcircuit_connectivity_map_key
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).toContain(
    '<DecouplingCapacitorsNotCloseTogether rail="VCC"',
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
