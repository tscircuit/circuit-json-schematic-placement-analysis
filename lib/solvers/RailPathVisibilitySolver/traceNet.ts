import type { CircuitJson } from "circuit-json"
import type { PlacementNetworkIndex } from "../../utils/placement-network-index"

export function traceNet(params: {
  trace: Extract<CircuitJson[number], { type: "schematic_trace" }>
  circuitJson: CircuitJson
  index: PlacementNetworkIndex
}): string | null {
  const { trace, circuitJson, index } = params
  if (trace.subcircuit_connectivity_map_key)
    return index.connected(
      `connectivity:${trace.subcircuit_connectivity_map_key}`,
    )
  const source = circuitJson.find(
    (element) =>
      element.type === "source_trace" &&
      element.source_trace_id === trace.source_trace_id,
  )
  if (source?.type !== "source_trace") return null
  const ids = [
    ...source.connected_source_port_ids,
    ...source.connected_source_net_ids,
  ]
  return ids[0] ? index.connected(ids[0]) : null
}
