import type { CircuitJson } from "circuit-json"

/** Resolve electrical membership across routed wires and labels alike.
 * Never join nets by display name, which may be reused in other subcircuits.
 */
export function getSourceConnectivity(
  circuitJson: CircuitJson,
): (id: string) => string {
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    const next = parent.get(id)
    if (next === undefined || next === id) return id
    const root = find(next)
    parent.set(id, root)
    return root
  }
  const join = (ids: string[]) => {
    const first = ids[0]
    if (!first) return
    const root = find(first)
    for (const id of ids.slice(1)) parent.set(find(id), root)
  }
  for (const element of circuitJson) {
    if (element.type === "source_port" || element.type === "source_net") {
      const id =
        element.type === "source_port"
          ? element.source_port_id
          : element.source_net_id
      if (element.subcircuit_connectivity_map_key)
        join([id, `connectivity:${element.subcircuit_connectivity_map_key}`])
    }
    if (element.type === "source_trace") {
      join([
        ...element.connected_source_port_ids,
        ...element.connected_source_net_ids,
        ...(element.subcircuit_connectivity_map_key
          ? [`connectivity:${element.subcircuit_connectivity_map_key}`]
          : []),
      ])
    }
    if (element.type === "source_component_internal_connection")
      join(element.source_port_ids)
    if (element.type === "source_component") {
      for (const ids of element.internally_connected_source_port_ids ?? [])
        join(ids)
    }
  }
  return find
}
