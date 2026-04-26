import { expect, test } from "bun:test"
import { SchematicPlacementAnalyzer } from "../src"
import { createSchematicAnalysisFixtureSvg } from "./fixtures/create-schematic-analysis-fixture-svg"
import { overlappingSchematicBoxesCircuitJson } from "./fixtures/overlapping-schematic-boxes"

test("generates a schematic box overlap issue", async () => {
  const analyzer = new SchematicPlacementAnalyzer(
    overlappingSchematicBoxesCircuitJson,
  )

  expect(analyzer.issues).toHaveLength(1)
  expect(analyzer.issues[0]).toMatchObject({
    type: "schematic_box_overlap",
    boxA: { label: "schematic_component_a" },
    boxB: { label: "schematic_component_b" },
    overlap: {
      width: 2,
      height: 1.5,
      area: 3,
      center: {
        x: 0.5,
        y: 0.25,
      },
    },
  })

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: overlappingSchematicBoxesCircuitJson,
      analyzer,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
