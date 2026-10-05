import type { CircuitJson } from "circuit-json"

/** Two isolated labeled nets: left host -- passive -- right host. */
export function createNetLabeledPassiveIsolationFixture(): CircuitJson {
  const json: CircuitJson = []
  for (const [id, x, passive] of [
    ["left", 0, false],
    ["passive", 7, true],
    ["right", 14, false],
  ] as const) {
    json.push(
      {
        type: "source_component",
        source_component_id: id,
        name: id,
        ...(passive
          ? { ftype: "simple_resistor" as const, resistance: 1000 }
          : { ftype: "simple_chip" as const }),
      },
      {
        type: "schematic_component",
        schematic_component_id: `sch_${id}`,
        source_component_id: id,
        center: { x, y: 0 },
        size: { width: 1, height: 1 },
        is_box_with_pins: true,
        ...(passive ? { symbol_name: "boxresistor_right" } : {}),
      },
    )
  }
  for (const [id, component, x, direction] of [
    ["left_pin", "left", 0.5, "right"],
    ["passive_left", "passive", 6.25, "left"],
    ["passive_right", "passive", 7.75, "right"],
    ["right_pin", "right", 13.5, "left"],
  ] as const) {
    json.push(
      {
        type: "source_port",
        source_port_id: id,
        source_component_id: component,
        name: id,
        port_hints: [],
      },
      {
        type: "schematic_port",
        schematic_port_id: `sch_${id}`,
        source_port_id: id,
        schematic_component_id: `sch_${component}`,
        center: { x, y: 0 },
        facing_direction: direction,
        side_of_component: direction,
        distance_from_component_edge: 0.25,
        true_ccw_index: 0,
        pin_number: 1,
        is_connected: true,
      },
    )
    const net =
      id === "left_pin" || id === "passive_left" ? "net_left" : "net_right"
    const anchor = { x: x + (direction === "left" ? -0.4 : 0.4), y: 0 }
    json.push(
      {
        type: "source_trace",
        source_trace_id: `src_${id}`,
        connected_source_port_ids: [id],
        connected_source_net_ids: [net],
      },
      {
        type: "schematic_trace",
        schematic_trace_id: `stub_${id}`,
        source_trace_id: `src_${id}`,
        edges: [{ from: { x, y: 0 }, to: { ...anchor } }],
        junctions: [],
      },
      {
        type: "schematic_net_label",
        schematic_net_label_id: `label_${id}`,
        source_net_id: net,
        source_trace_id: `src_${id}`,
        center: { ...anchor },
        anchor_position: { ...anchor },
        anchor_side: direction,
        text: net,
      },
    )
  }
  for (const id of ["net_left", "net_right"])
    json.push({
      type: "source_net",
      source_net_id: id,
      name: id,
      member_source_group_ids: [],
    })
  return json
}
