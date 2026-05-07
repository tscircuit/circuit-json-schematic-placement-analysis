import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createCircuitJson } from "../assets/led-resistor-alignment"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("isn't aligned", async () => {
  const verticalCapacitorCircuitJson = await createCircuitJson()
  const analysis = analyzeSchematicPlacement(verticalCapacitorCircuitJson)
  // const issuesLineItem = analysis
  //   .getLineItems()
  //   .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  // expect(issuesLineItem).toBeUndefined()
  // expect(analysis.toString()).not.toContain("CapacitorSymbolHorizontal")

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: verticalCapacitorCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
