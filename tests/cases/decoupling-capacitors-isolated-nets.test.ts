import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not merge electrically isolated rails with identical names", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: -10, rail: "VCC" },
    { name: "C2", schX: 10, rail: "VDD" },
  ])
  // Retain distinct net IDs and connectivity while giving both the same label.
  for (const element of circuitJson) {
    if (element.type === "source_net" && element.name === "VDD")
      element.name = "VCC"
    if (element.type === "schematic_net_label" && element.text === "VDD")
      element.text = "VCC"
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).not.toContain(
    "DecouplingCapacitorsNotCloseTogether",
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
