import type { CircuitJson } from "circuit-json"
import published from "./published.circuit.json"

// Complete four-sheet export from a USB-C four-port hub with an SD reader.
// The source and schematic records are retained unchanged from the supplied export.
export const usbHubBoard = published as unknown as CircuitJson
