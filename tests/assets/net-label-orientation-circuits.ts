import type { CircuitJson } from "circuit-json"

export const unreadableNetLabelCircuitJson: CircuitJson = [
  {
    type: "source_net",
    source_net_id: "net_GND",
    name: "GND",
    member_source_group_ids: [],
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "schematic_net_label_GND",
    source_net_id: "net_GND",
    center: { x: 0, y: 0 },
    anchor_position: { x: -1, y: 1 },
    anchor_side: "left",
    text: "GND",
  },
]

export const readableNetLabelCircuitJson: CircuitJson = [
  {
    type: "source_net",
    source_net_id: "net_V3_3",
    name: "V3_3",
    member_source_group_ids: [],
  },
  {
    type: "schematic_net_label",
    schematic_net_label_id: "schematic_net_label_V3_3",
    source_net_id: "net_V3_3",
    center: { x: 0, y: 0 },
    anchor_position: { x: 0, y: -1 },
    anchor_side: "bottom",
    text: "V3_3",
  },
]
