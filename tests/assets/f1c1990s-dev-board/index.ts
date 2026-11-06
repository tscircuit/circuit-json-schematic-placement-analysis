import type { CircuitJson } from "circuit-json"
import published from "./published.circuit.json"

// seveibar/f1c1990s-dev-board@1.8.0, release fd3150a5-1b3e-474f-aeea-30c5478132cd.
// Complete 90-component sheet; schematic records and connectivity are unchanged.
// U_1V8/U_1V2 supply flags updated from tsci import --jlcpcb C176944/C460310 (CLI 0.1.2210):
// pin 1 requires power, pin 5 provides power. AP2112 pin descriptions:
// https://www.diodes.com/datasheet/download/AP2112.pdf#page=2
export const f1c1990sDevBoard = published as unknown as CircuitJson
