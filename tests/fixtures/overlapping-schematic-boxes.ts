import type { AnyCircuitElement } from "circuit-json"

export const overlappingSchematicBoxesCircuitJson: AnyCircuitElement[] = [
  {
    type: "schematic_box",
    schematic_component_id: "schematic_component_a",
    width: 3,
    height: 2,
    is_dashed: false,
    x: 0,
    y: 0,
  },
  {
    type: "schematic_box",
    schematic_component_id: "schematic_component_b",
    width: 3,
    height: 2,
    is_dashed: false,
    x: 1,
    y: 0.5,
  },
]
