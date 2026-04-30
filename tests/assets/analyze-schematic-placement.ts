import type { CircuitJson } from "circuit-json"

export const analyzeSchematicPlacementCircuitJson: CircuitJson = [
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
