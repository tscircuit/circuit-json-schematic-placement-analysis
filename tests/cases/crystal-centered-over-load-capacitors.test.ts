import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createCrystalCenteredOverLoadCapacitorsCircuitJson } from "../assets/crystal-centered-over-load-capacitors"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not report a crystal centered over its load capacitors", async () => {
  const circuitJson = await createCrystalCenteredOverLoadCapacitorsCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const crystalPlacementIssues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
    .filter(
      (issue) => issue.lineItemType === "CrystalNotCenteredOverLoadCapacitors",
    )

  expect(crystalPlacementIssues).toHaveLength(0)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
