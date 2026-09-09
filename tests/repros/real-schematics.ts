import { wirelessMouseControllerSheetCircuitJson } from "../assets/wireless-mouse-controller-sheet"
import { wirelessMouseSensorSheetCircuitJson } from "../assets/wireless-mouse-sensor-sheet"
import { trellisCoreCircuitJson } from "../assets/trellis-core"

// Reuse the checked-in complete sheet imports without moving components or adding errors.
export const realSchematics = [
  {
    name: "Wireless mouse — controller",
    circuitJson: wirelessMouseControllerSheetCircuitJson,
  },
  {
    name: "Wireless mouse — sensor",
    circuitJson: wirelessMouseSensorSheetCircuitJson,
  },
  {
    name: "Trellis Core — all five sheets (v0.2.9)",
    circuitJson: trellisCoreCircuitJson,
  },
]
