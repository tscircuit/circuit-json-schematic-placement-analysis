import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorRailsCircuitJson } from "../assets/decoupling-capacitor-rails"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts the distance limit and flags a gap just beyond it", async () => {
  const circuitJson = await createDecouplingCapacitorRailsCircuitJson([
    { name: "C1", schX: 0 },
    { name: "C2", schX: 3, schY: 4 },
    { name: "C3", schX: 10 },
    { name: "C4", schX: 13, schY: 4.01 },
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
  expect(issues).toHaveLength(2)
  expect(issues.every((issue) => issue.distance > 5)).toBe(true)
  expect(
    issues.some(
      (issue) =>
        issue.firstCapacitorSchematicBox.sourceComponentName === "C3" &&
        issue.secondCapacitorSchematicBox.sourceComponentName === "C4",
    ),
  ).toBe(true)
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
