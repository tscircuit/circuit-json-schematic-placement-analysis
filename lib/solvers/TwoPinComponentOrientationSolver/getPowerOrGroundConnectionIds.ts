import type { CircuitJson } from "circuit-json"
import {
  findConnectedNetworks,
  getSourcePortConnectivityMapFromCircuitJson,
} from "circuit-json-to-connectivity-map"

export function getPowerOrGroundConnectionIds(
  circuitJson: CircuitJson,
): Set<string> {
  const powerOrGroundIds = new Set<string>()
  const idsByConnectivityKey = new Map<string, string[]>()

  for (const element of circuitJson) {
    if (element.type !== "source_net" && element.type !== "source_port")
      continue

    const id =
      element.type === "source_net"
        ? element.source_net_id
        : element.source_port_id
    const isPowerOrGround =
      element.type === "source_net"
        ? element.is_power ||
          element.is_ground ||
          element.is_positive_voltage_source
        : element.provides_power ||
          element.requires_power ||
          element.provides_ground ||
          element.requires_ground
    if (isPowerOrGround) powerOrGroundIds.add(id)

    const key = element.subcircuit_connectivity_map_key
    if (key !== undefined) {
      const ids = idsByConnectivityKey.get(key) ?? []
      ids.push(id)
      idsByConnectivityKey.set(key, ids)
    }
  }

  // Join source traces/internal connections and precomputed connectivity keys.
  // Never traverse through a component merely because it has two pins.
  const sourceConnectivity =
    getSourcePortConnectivityMapFromCircuitJson(circuitJson)
  const networks = findConnectedNetworks([
    ...Object.values(sourceConnectivity.netMap),
    ...idsByConnectivityKey.values(),
  ])
  for (const ids of Object.values(networks)) {
    if (ids.some((id) => powerOrGroundIds.has(id))) {
      for (const id of ids) powerOrGroundIds.add(id)
    }
  }

  return powerOrGroundIds
}
