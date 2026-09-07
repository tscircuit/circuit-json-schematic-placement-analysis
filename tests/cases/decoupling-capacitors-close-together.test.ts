import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts a continuous capacitor row whose endpoints are far apart", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: -6 },
    { name: "C2", schX: -2 },
    { name: "C3", schX: 2 },
    { name: "C4", schX: 6 },
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).not.toContain(
    "DecouplingCapacitorsNotCloseTogether",
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
