import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createVerticalCapacitorCircuitJson } from "../assets/vertical-capacitor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not generate an orientation issue for a vertical capacitor", async () => {
  const verticalCapacitorCircuitJson =
    await createVerticalCapacitorCircuitJson()
  const analysis = analyzeSchematicPlacement(verticalCapacitorCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  expect(issuesLineItem).toBeUndefined()
  expect(analysis.toString()).not.toContain("CapacitorSymbolHorizontal")

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: verticalCapacitorCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
