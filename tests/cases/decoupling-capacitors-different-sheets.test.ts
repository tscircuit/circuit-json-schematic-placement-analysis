import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not compare capacitors on different sheets sharing the same rail", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: -10, schSheetName: "Power" },
    { name: "C2", schX: 10, schSheetName: "Logic" },
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  const components = circuitJson.filter(
    (element) => element.type === "schematic_component",
  )
  expect(
    new Set(components.map((component) => component.schematic_sheet_id)).size,
  ).toBe(2)
  expect(analysis.toString()).not.toContain(
    "DecouplingCapacitorsNotCloseTogether",
  )
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
