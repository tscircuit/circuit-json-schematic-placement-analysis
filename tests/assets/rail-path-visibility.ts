import { compactRailPathRepro } from "../fixtures/compact-rail-path-repro"
import type { CircuitJson } from "circuit-json"

/** Reconstruction of the supplied screenshot, not an export of the live URL.
 * Names/values are presentation only. IDs and typed flags establish topology.
 */
export function createRailPathRepro({
  compact = false,
  power = false,
}: {
  compact?: boolean
  power?: boolean
} = {}): CircuitJson {
  if (compact) return compactRailPathRepro(createRailPathRepro({ power }))
  const circuit: any[] = []
  const sheet = "visibility-sheet"
  const common = { schematic_sheet_id: sheet }
  const components = [
    {
      id: "host",
      name: "U_PD",
      ftype: "simple_chip",
      x: 8,
      y: 3.5,
      width: 2.2,
      height: 6,
      symbol: undefined,
      value: undefined,
    },
    {
      id: "series",
      name: "R1",
      ftype: "simple_resistor",
      x: 2,
      y: 6,
      width: 0.9,
      height: 0.6,
      symbol: "boxresistor_right",
      value: 470,
    },
    {
      id: "upper",
      name: "R11",
      ftype: "simple_resistor",
      x: -1,
      y: -4,
      width: 0.6,
      height: 0.9,
      symbol: "boxresistor_down",
      value: 100000,
    },
    {
      id: "lower",
      name: "R12",
      ftype: "simple_resistor",
      x: -1,
      y: -6.5,
      width: 0.6,
      height: 0.9,
      symbol: "boxresistor_down",
      value: 15000,
    },
    {
      id: "filter",
      name: "C4",
      ftype: "simple_capacitor",
      x: 2,
      y: -6.5,
      width: 0.6,
      height: 0.9,
      symbol: "capacitor_down",
      value: 1e-8,
    },
  ]
  const port = (
    id: string,
    component: string,
    pin: number,
    x: number,
    y: number,
    net: string,
    facing: string,
    label?: string,
  ) => {
    circuit.push({
      type: "source_port",
      source_port_id: id,
      source_component_id: component,
      name: label ?? `pin${pin}`,
      pin_number: pin,
      subcircuit_connectivity_map_key: net,
    })
    circuit.push({
      type: "schematic_port",
      schematic_port_id: `sch-${id}`,
      schematic_component_id: `sch-${component}`,
      source_port_id: id,
      center: { x, y },
      facing_direction: facing,
      side_of_component:
        facing === "up" ? "top" : facing === "down" ? "bottom" : facing,
      pin_number: pin,
      display_pin_label: label,
      distance_from_component_edge: 0.4,
      is_connected: true,
      ...common,
    })
  }
  for (const c of components) {
    circuit.push({
      type: "source_component",
      source_component_id: c.id,
      name: c.name,
      ftype: c.ftype,
      source_group_id: "visibility-group",
      subcircuit_id: "visibility-subcircuit",
      ...(c.ftype === "simple_resistor"
        ? { resistance: c.value }
        : c.ftype === "simple_capacitor"
          ? { capacitance: c.value }
          : {}),
    })
    circuit.push({
      type: "schematic_component",
      schematic_component_id: `sch-${c.id}`,
      source_component_id: c.id,
      center: { x: c.x, y: c.y },
      size: { width: c.width, height: c.height },
      symbol_name: c.symbol,
      is_box_with_pins: true,
      symbol_display_value:
        c.id === "series"
          ? "470Ω"
          : c.id === "upper"
            ? "100kΩ"
            : c.id === "lower"
              ? "15kΩ"
              : c.id === "filter"
                ? "10nF / 50V"
                : undefined,
      schematic_group_id: "visibility-group",
      subcircuit_id: "visibility-subcircuit",
      ...common,
    })
  }
  port("host-sense", "host", 18, 6.5, 4, "sense", "left", "VBUS_VS_DISCH")
  port("host-unused", "host", 1, 6.5, 3, "unused", "left", "CC1")
  port("host-unused-2", "host", 2, 6.5, 2, "unused2", "left", "CC2")
  const series = components[1]!,
    upper = components[2]!,
    lower = components[3]!,
    filter = components[4]!
  port("series-right", "series", 2, series.x + 0.45, series.y, "sense", "right")
  port("series-left", "series", 1, series.x - 0.45, series.y, "input", "left")
  port("upper-top", "upper", 1, upper.x, upper.y + 0.45, "input", "up")
  port("upper-bottom", "upper", 2, upper.x, upper.y - 0.45, "tap", "down")
  port("lower-top", "lower", 1, lower.x, lower.y + 0.45, "tap", "up")
  port("lower-bottom", "lower", 2, lower.x, lower.y - 0.45, "rail", "down")
  port("filter-top", "filter", 1, filter.x, filter.y + 0.45, "tap", "up")
  port("filter-bottom", "filter", 2, filter.x, filter.y - 0.45, "rail", "down")
  const wire = (id: string, net: string, points: number[][]) =>
    circuit.push({
      type: "schematic_trace",
      schematic_trace_id: id,
      source_trace_id: id,
      subcircuit_connectivity_map_key: net,
      edges: points.slice(1).map((p, i) => ({
        from: { x: points[i]![0], y: points[i]![1] },
        to: { x: p[0], y: p[1] },
      })),
      junctions: [],
      ...common,
    })
  wire("sense-wire", "sense", [
    [6.5, 4],
    [4.6, 4],
    [4.6, series.y],
    [series.x + 0.45, series.y],
  ])
  wire("long-input-wire", "input", [
    [series.x - 0.45, series.y],
    [upper.x, series.y],
    [upper.x, upper.y + 0.45],
  ])
  const tapY = -5.7
  wire("tap-wire", "tap", [
    [upper.x, upper.y - 0.45],
    [upper.x, tapY],
    [lower.x, lower.y + 0.45],
  ])
  wire("filter-wire", "tap", [
    [upper.x, tapY],
    [filter.x, tapY],
    [filter.x, filter.y + 0.45],
  ])
  const railY = -7.7
  for (const c of [lower, filter]) {
    wire(`rail-wire-${c.id}`, "rail", [
      [c.x, c.y - 0.45],
      [c.x, railY],
    ])
    circuit.push({
      type: "schematic_net_label",
      schematic_net_label_id: `label-${c.id}`,
      source_net_id: "return-net",
      text: power ? "+3V3" : "GND",
      anchor_position: { x: c.x, y: railY },
      center: { x: c.x, y: railY - 0.1 },
      anchor_side: "top",
      symbol_name: power ? "rail_up" : "ground_down",
      ...common,
    })
  }
  circuit.push({
    type: "source_net",
    source_net_id: "return-net",
    name: power ? "+3V3" : "GND",
    is_ground: !power,
    is_power: power,
    is_positive_voltage_source: power,
    subcircuit_connectivity_map_key: "rail",
  })
  circuit.push({
    type: "schematic_text",
    schematic_text_id: "heading",
    text: "Input-voltage monitor",
    anchor: "center",
    position: { x: 1.2, y: -2.5 },
    font_size: 0.22,
    ...common,
  })
  return circuit as CircuitJson
}
