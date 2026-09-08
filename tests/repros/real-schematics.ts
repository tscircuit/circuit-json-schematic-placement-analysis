import { wirelessMouseControllerSheetCircuitJson } from "../assets/wireless-mouse-controller-sheet"
import { wirelessMouseSensorSheetCircuitJson } from "../assets/wireless-mouse-sensor-sheet"

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
]
