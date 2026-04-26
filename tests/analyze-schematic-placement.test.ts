import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"

test("outputs schematic box positions", () => {
  const circuitJson: CircuitJson = [
    {
      type: "schematic_box",
      schematic_component_id: "schematic_component_1",
      schematic_symbol_id: "schematic_symbol_1",
      width: 2.5,
      height: 1.25,
      is_dashed: false,
      x: 10,
      y: -3.125,
    },
    {
      type: "schematic_box",
      width: 4,
      height: 2,
      is_dashed: true,
      x: -1,
      y: 5,
      subcircuit_id: "subcircuit_1",
    },
  ]

  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(analysis.getLineItems()).toEqual([
    {
      lineItemType: "SchematicBoxPlacement",
      positionAnchor: "center",
      schX: 10,
      schY: -3.125,
      width: 2.5,
      height: 1.25,
      schematicComponentId: "schematic_component_1",
      schematicSymbolId: "schematic_symbol_1",
    },
    {
      lineItemType: "SchematicBoxPlacement",
      positionAnchor: "center",
      schX: -1,
      schY: 5,
      width: 4,
      height: 2,
      subcircuitId: "subcircuit_1",
    },
  ])
  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicBoxPositions>
    <SchematicBoxPlacement positionAnchor="center" schX="10" schY="-3.125" width="2.5" height="1.25" />
    <SchematicBoxPlacement positionAnchor="center" schX="-1" schY="5" width="4" height="2" />
    </SchematicBoxPositions>"
  `)
  expect(analysis.getString()).toBe(analysis.toString())
})
