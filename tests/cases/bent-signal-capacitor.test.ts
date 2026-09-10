import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createHorizontalSignalCapacitorCircuitJson } from "../assets/horizontal-signal-capacitor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("accepts a horizontal capacitor when a downstream trace bends", async () => {
  const circuitJson = await createHorizontalSignalCapacitorCircuitJson({
    bent: true,
  })
  expectReproRendered(circuitJson, 5)
  expectReproNets(circuitJson, [
    ["U1.OUT", "R1.pin1"],
    ["R1.pin2", "C1.pin1"],
    ["C1.pin2", "R2.pin1"],
    ["R2.pin2", "U2.IN"],
  ])
  expect(
    circuitJson.some(
      (element) =>
        element.type === "schematic_trace" &&
        element.edges.some(
          (edge) => edge.from.x === edge.to.x && edge.from.y !== edge.to.y,
        ),
    ),
  ).toBe(true)

  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
  expect(
    issues.filter(
      (issue) => issue.lineItemType === "CapacitorSymbolHorizontal",
    ),
  ).toEqual([])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["CapacitorSymbolHorizontal"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
