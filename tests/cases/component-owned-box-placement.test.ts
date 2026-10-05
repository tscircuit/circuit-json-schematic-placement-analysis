import { expect, test } from "bun:test"
import type { CircuitJson, SchematicBox } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { buildSolverContext } from "lib/utils/placements"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("preserves component and symbol owned boxes and converts standalone box corners to centres", async () => {
  const componentBox: SchematicBox = {
    type: "schematic_box",
    schematic_component_id: "missing_component",
    x: 10,
    y: 20,
    width: 4,
    height: 2,
    is_dashed: false,
  }
  const symbolBox: SchematicBox = {
    type: "schematic_box",
    schematic_symbol_id: "symbol_without_component",
    x: 12,
    y: 21,
    width: 4,
    height: 2,
    is_dashed: true,
  }
  const circuitJson: CircuitJson = [componentBox, symbolBox]
  const original = JSON.stringify(circuitJson)
  const placements = buildSolverContext(circuitJson).componentPlacements
  expect(placements).toMatchObject([
    {
      schematicComponentId: "missing_component",
      schX: 12,
      schY: 21,
      width: 4,
      height: 2,
    },
    {
      schematicSymbolId: "symbol_without_component",
      schX: 14,
      schY: 22,
      width: 4,
      height: 2,
    },
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toMatchObject([
    { lineItemType: "ComponentOverlap", overlapWidth: 2, overlapHeight: 1 },
  ])
  await expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      height: 400,
    }).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path)

  // A normal component record remains authoritative for the centre. Its owned
  // box supplies dimensions once, rather than becoming a duplicate placement.
  const complete: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "source",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "schematic_component",
      schematic_component_id: "missing_component",
      source_component_id: "source",
      center: { x: 12, y: 21 },
      size: { width: 1, height: 1 },
      is_box_with_pins: true,
    },
    componentBox,
  ]
  expect(buildSolverContext(complete).componentPlacements).toMatchObject([
    { sourceComponentName: "U1", schX: 12, schY: 21, width: 4, height: 2 },
  ])
  expect(JSON.stringify(circuitJson)).toBe(original)
})
