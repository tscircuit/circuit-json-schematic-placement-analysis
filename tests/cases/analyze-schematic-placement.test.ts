import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { analyzeSchematicPlacementCircuitJson } from "../assets/analyze-schematic-placement"

test("outputs schematic box positions", () => {
  const analysis = analyzeSchematicPlacement(
    analyzeSchematicPlacementCircuitJson,
  )

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
    <SchematicBoxPlacement componentName="U1" positionAnchor="center" schX="10" schY="-3.125" width="2.5" height="1.25" />
    <SchematicBoxPlacement positionAnchor="center" schX="-1" schY="5" width="4" height="2" />
    </SchematicBoxPositions>"
  `)
  expect(analysis.getString()).toBe(analysis.toString())
})
