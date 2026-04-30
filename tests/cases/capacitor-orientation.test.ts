import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createHorizontalCapacitorCircuitJson } from "../assets/horizontal-capacitor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a horizontal capacitor orientation issue", async () => {
  const horizontalCapacitorCircuitJson =
    await createHorizontalCapacitorCircuitJson()
  const analysis = analyzeSchematicPlacement(horizontalCapacitorCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  expect(issuesLineItem).toMatchObject({
    lineItemType: "SchematicPlacementIssues",
    issues: [
      {
        lineItemType: "CapacitorSymbolHorizontal",
        schematicBox: {
          positionAnchor: "center",
          schX: 0,
          schY: 0,
          sourceComponentName: "C1",
        },
      },
    ],
  })

  expect(analysis.toString()).toContain(
    '<CapacitorSymbolHorizontal componentName="C1" schX="0" schY="0" width="1.1" height="0.84" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: horizontalCapacitorCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
