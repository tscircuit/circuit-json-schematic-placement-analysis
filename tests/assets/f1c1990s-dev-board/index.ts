import type { CircuitJson } from "circuit-json"
import published from "./published.circuit.json"

// seveibar/f1c1990s-dev-board@1.8.0, release fd3150a5-1b3e-474f-aeea-30c5478132cd.
// Unchanged source_* and schematic_* records; complete 90-component sheet.
export const f1c1990sDevBoard = published as unknown as CircuitJson
