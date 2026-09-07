import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports one nearest pair between separated capacitor groups", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: -10 },
    { name: "C2", schX: -8 },
    { name: "C3", schX: 8 },
    { name: "C4", schX: 10 },
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
      railName: "VCC",
      firstCapacitorSchematicBox: { sourceComponentName: "C2" },
      secondCapacitorSchematicBox: { sourceComponentName: "C3" },
      distance: 16,
      maxAllowedDistance: 5,
    },
  ])
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
