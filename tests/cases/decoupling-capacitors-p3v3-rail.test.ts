import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("recognizes the P3V3 rail from the reported schematic without power metadata", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C9", schX: -10, rail: "P3V3" },
    { name: "C10", schX: 10, rail: "P3V3" },
  ])
  for (const element of circuitJson) {
    if (element.type === "source_net") {
      delete element.is_power
      delete element.is_positive_voltage_source
      delete element.is_ground
    }
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).toContain(
    '<DecouplingCapacitorsNotCloseTogether rail="P3V3"',
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
