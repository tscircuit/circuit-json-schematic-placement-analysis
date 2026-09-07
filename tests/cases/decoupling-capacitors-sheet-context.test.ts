import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("includes both capacitor placements and their sheet in grouping diagnostics", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: -10, schSheetName: "Power" },
    { name: "C2", schX: 10, schSheetName: "Power" },
    { name: "C3", schX: 0, schSheetName: "Logic" },
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
    .filter(
      (issue) => issue.lineItemType === "DecouplingCapacitorsNotCloseTogether",
    )
  expect(issues).toMatchObject([
    {
      firstCapacitorSchematicBox: {
        sourceComponentName: "C1",
        schematicSheetName: "Power",
      },
      secondCapacitorSchematicBox: {
        sourceComponentName: "C2",
        schematicSheetName: "Power",
      },
    },
  ])
  expect(analysis.toString()).toContain('<SchematicSheet name="Power"')
  expect(analysis.toString()).not.toContain('componentName="C3"')
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
