import { Circuit } from "@tscircuit/core"
import type { CircuitJson, SchematicPort, SchematicText } from "circuit-json"

/** The port-to-net form intentionally renders labels as trace-backed text. */
export async function createLocalPassiveNetLabelFixture() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled>
      <chip
        name="part_a"
        schX={0}
        schY={0}
        schWidth={1}
        schHeight={1}
        pinLabels={{ pin1: "x", pin2: "y" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
          leftSide: { pins: ["pin2"], direction: "top-to-bottom" },
        }}
      />
      <resistor name="part_b" resistance="1k" schX={4} schY={1} />
      <trace from=".part_a > .pin1" to="net.branch" />
      <trace from=".part_b > .pin1" to="net.branch" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const json = circuit.getCircuitJson()
  const pins = getLocalPassivePins(json)
  const sourceTraces = json.filter((e) => e.type === "source_trace")
  // Reproduce the newer exporter representation used by Museview: independent
  // port-to-net stubs annotated by schematic_text with source_trace_id.
  for (let i = json.length - 1; i >= 0; i--)
    if (
      json[i]?.type === "schematic_trace" ||
      json[i]?.type === "schematic_net_label"
    )
      json.splice(i, 1)
  for (const [i, pin] of pins.entries()) {
    const sourceTrace = sourceTraces[i]!
    const direction = pin.facing_direction === "right" ? 1 : -1
    json.push({
      type: "schematic_trace",
      schematic_trace_id: `stub_${i}`,
      source_trace_id: sourceTrace.source_trace_id,
      edges: [
        {
          from: pin.center,
          to: { x: pin.center.x + direction * 0.6, y: pin.center.y },
        },
      ],
      junctions: [],
      subcircuit_connectivity_map_key:
        sourceTrace.subcircuit_connectivity_map_key,
    })
    json.push({
      type: "schematic_text",
      schematic_text_id: `branch_label_${i}`,
      source_trace_id: sourceTrace.source_trace_id,
      position: { x: pin.center.x + direction * 0.1, y: pin.center.y + 0.06 },
      rotation: 0,
      anchor: direction === 1 ? "left" : "right",
      font_size: 0.12,
      color: "black",
      text: "branch",
    } as SchematicText & { source_trace_id: string })
  }
  return json
}

export function getLocalPassivePins(
  json: CircuitJson,
): [SchematicPort, SchematicPort] {
  const source = json.filter((e) => e.type === "source_trace")
  return source.map((trace) => {
    const pin = json.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === trace.connected_source_port_ids[0],
    )
    if (!pin || pin.type !== "schematic_port")
      throw new Error("Missing fixture pin")
    return pin
  }) as [SchematicPort, SchematicPort]
}
