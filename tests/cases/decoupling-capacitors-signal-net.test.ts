import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("ignores capacitors on a signal net or without a ground connection", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: -10, rail: "SIGNAL" },
    { name: "C2", schX: 10, rail: "SIGNAL" },
    { name: "C3", schX: -10, schY: -5, ground: "SIGNAL" },
    { name: "C4", schX: 10, schY: -5, ground: null },
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).not.toContain(
    "DecouplingCapacitorsNotCloseTogether",
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
