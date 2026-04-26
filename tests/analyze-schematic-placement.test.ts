import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"

test("outputs schematic box positions", () => {
  const circuitJson: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_1",
      source_component_id: "source_component_1",
      size: { width: 2.5, height: 1.25 },
      center: { x: 10, y: -3.125 },
      is_box_with_pins: true,
    },
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
      sourceComponentId: "source_component_1",
      sourceComponentName: "U1",
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
    <SchematicBoxPlacement componentName="U1" sourceComponentId="source_component_1" schematicComponentId="schematic_component_1" schematicSymbolId="schematic_symbol_1" positionAnchor="center" schX="10" schY="-3.125" width="2.5" height="1.25" />
    <SchematicBoxPlacement subcircuitId="subcircuit_1" positionAnchor="center" schX="-1" schY="5" width="4" height="2" />
    </SchematicBoxPositions>"
  `)
  expect(analysis.getString()).toBe(analysis.toString())
})
