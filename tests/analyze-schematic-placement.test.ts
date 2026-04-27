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

test("returns an empty wrapper when there are no schematic boxes", () => {
  const analysis = analyzeSchematicPlacement([])

  expect(analysis.getLineItems()).toEqual([])
  expect(analysis.toString()).toBe(
    "<SchematicBoxPositions>\n</SchematicBoxPositions>",
  )
})

test("reports horizontal capacitor symbols", () => {
  const circuitJson: CircuitJson = [
    {
      type: "source_component",
      ftype: "simple_capacitor",
      source_component_id: "source_component_cap",
      name: "C1",
      capacitance: 1e-6,
    },
    {
      type: "source_component",
      ftype: "simple_resistor",
      source_component_id: "source_component_res",
      name: "R1",
      resistance: 1000,
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_cap_horizontal",
      source_component_id: "source_component_cap",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 1 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_cap_vertical",
      source_component_id: "source_component_cap",
      center: { x: 4, y: 0 },
      size: { width: 1, height: 2 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_res_horizontal",
      source_component_id: "source_component_res",
      center: { x: 8, y: 0 },
      size: { width: 2, height: 1 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_box",
      schematic_component_id: "schematic_component_cap_horizontal",
      width: 2,
      height: 1,
      is_dashed: false,
      x: 0,
      y: 0,
    },
    {
      type: "schematic_box",
      schematic_component_id: "schematic_component_cap_vertical",
      width: 1,
      height: 2,
      is_dashed: false,
      x: 4,
      y: 0,
    },
    {
      type: "schematic_box",
      schematic_component_id: "schematic_component_res_horizontal",
      width: 2,
      height: 1,
      is_dashed: false,
      x: 8,
      y: 0,
    },
  ]

  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(analysis.getLineItems()).toContainEqual({
    lineItemType: "SchematicPlacementIssues",
    issues: [
      {
        lineItemType: "CapacitorSymbolHorizontal",
        schematicBox: {
          positionAnchor: "center",
          schX: 0,
          schY: 0,
          width: 2,
          height: 1,
          schematicComponentId: "schematic_component_cap_horizontal",
        },
      },
    ],
  })
  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicBoxPositions>
    <SchematicBoxPlacement positionAnchor="center" schX="0" schY="0" width="2" height="1" />
    <SchematicBoxPlacement positionAnchor="center" schX="4" schY="0" width="1" height="2" />
    <SchematicBoxPlacement positionAnchor="center" schX="8" schY="0" width="2" height="1" />
    <SchematicPlacementIssues>
    <CapacitorSymbolHorizontal positionAnchor="center" schX="0" schY="0" width="2" height="1" />
    </SchematicPlacementIssues>
    </SchematicBoxPositions>"
  `)
})

test("reports horizontal capacitor symbols by schematic symbol name", () => {
  const circuitJson: CircuitJson = [
    {
      type: "schematic_symbol",
      schematic_symbol_id: "schematic_symbol_cap",
      name: "capacitor",
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_symbol_cap",
      schematic_symbol_id: "schematic_symbol_cap",
      center: { x: 1, y: 2 },
      size: { width: 2, height: 1 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_box",
      schematic_component_id: "schematic_component_symbol_cap",
      width: 2,
      height: 1,
      is_dashed: false,
      x: 1,
      y: 2,
    },
  ]

  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(analysis.getLineItems()).toEqual([
    {
      lineItemType: "SchematicBoxPlacement",
      positionAnchor: "center",
      schX: 1,
      schY: 2,
      width: 2,
      height: 1,
      schematicComponentId: "schematic_component_symbol_cap",
    },
    {
      lineItemType: "SchematicPlacementIssues",
      issues: [
        {
          lineItemType: "CapacitorSymbolHorizontal",
          schematicBox: {
            positionAnchor: "center",
            schX: 1,
            schY: 2,
            width: 2,
            height: 1,
            schematicComponentId: "schematic_component_symbol_cap",
          },
        },
      ],
    },
  ])
})
