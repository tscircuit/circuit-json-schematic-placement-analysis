import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("keeps capacitors on different power rails separate despite shared ground", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: -10, rail: "VCC" },
    { name: "C2", schX: 10, rail: "VDD" },
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).not.toContain(
    "DecouplingCapacitorsNotCloseTogether",
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
