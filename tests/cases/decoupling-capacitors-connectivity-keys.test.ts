import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("uses connectivity keys with reversed capacitor pins and no source traces", async () => {
  const circuitJson = (
    await createDecouplingCapacitorRailsCircuitJson([
      { name: "C1", schX: -10 },
      { name: "C2", schX: 10, rail: "GND", ground: "VCC" },
    ])
  ).filter((element) => element.type !== "source_trace")
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).toContain(
    '<DecouplingCapacitorsNotCloseTogether rail="VCC"',
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
