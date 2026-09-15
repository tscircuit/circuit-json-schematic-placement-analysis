import type { CircuitJson, SchematicTrace } from "circuit-json"
import { createTraceSimplificationCircuitJson } from "./trace-simplification"

export async function createTraceMovementObstacle(
  kind:
    | "route"
    | "body"
    | "other-connection"
    | "junction"
    | "other-sheet"
    | "text"
    | "crossing"
    | "net-label"
    | "reroute-only",
): Promise<CircuitJson> {
  const json = await createTraceSimplificationCircuitJson({
    resistorSchX: kind === "reroute-only" ? 1 : 0,
  })
  if (kind === "reroute-only") {
    const trace = json.find((e) => e.type === "schematic_trace")!
    if (trace.type !== "schematic_trace") throw new Error("Missing trace")
    const points = [
      trace.edges[0]!.from,
      { x: 0.8, y: 0 },
      { x: 0.8, y: 0.725 },
      { x: 1, y: 0.725 },
      trace.edges.at(-1)!.to,
    ]
    trace.edges = points.slice(1).map((to, i) => ({ from: points[i]!, to }))
    return json
  }
  if (kind === "net-label") {
    json.push({
      type: "schematic_net_label",
      schematic_net_label_id: "obstacle_label",
      text: "BLOCK",
      center: { x: 0.9, y: 1.1 },
      anchor_position: { x: 0.7, y: 1.1 },
      anchor_side: "left",
      source_net_id: "obstacle_net",
    })
    return json
  }
  if (kind === "text") {
    json.push({
      type: "schematic_text",
      schematic_text_id: "obstacle_text",
      text: "BLOCK",
      position: { x: 0.8, y: 1 },
      anchor: "center",
      rotation: 0,
      font_size: 0.18,
      color: "black",
    })
    return json
  }
  if (kind === "route" || kind === "other-sheet") {
    json.push({
      type: "schematic_component",
      schematic_component_id: "obstacle",
      is_box_with_pins: true,
      source_component_id: "obstacle_source",
      center: { x: 0.8, y: 1.1 },
      size: { width: 0.2, height: 0.2 },
      ...(kind === "other-sheet" ? { schematic_sheet_id: "other" } : {}),
    })
    return json
  }
  const trace: SchematicTrace = {
    type: "schematic_trace",
    schematic_trace_id: "other",
    source_trace_id: "other_source",
    edges: [],
    junctions: [],
  }
  if (kind === "crossing")
    trace.edges = [{ from: { x: 0.5, y: 1.1 }, to: { x: 1.2, y: 1.1 } }]
  if (kind === "body")
    trace.edges = [{ from: { x: 0.5, y: 2 }, to: { x: 1.2, y: 2 } }]
  if (kind === "junction")
    trace.edges = [{ from: { x: 0.8, y: 0.5 }, to: { x: 1.4, y: 0.5 } }]
  if (kind === "other-connection") {
    const port = json.find(
      (e) =>
        e.type === "schematic_port" &&
        e.schematic_port_id === "schematic_port_2",
    )!
    if (port.type !== "schematic_port") throw new Error("Missing port")
    json.push({
      ...port,
      schematic_port_id: "remote",
      schematic_component_id: "remote",
      source_port_id: "remote",
      center: { x: 0, y: 4 },
      facing_direction: "down",
    })
    trace.edges = [{ from: port.center, to: { x: 0, y: 4 } }]
  }
  json.push(trace)
  return json
}
