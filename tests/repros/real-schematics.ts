import type { CircuitJson } from "circuit-json"
import {
  rp2040BldcCircuitJson,
  rp2040BldcSheetSvgs,
} from "../assets/rp2040-bldc-controller"
import { wirelessMouseControllerSheetCircuitJson } from "../assets/wireless-mouse-controller-sheet"
import { wirelessMouseSensorSheetCircuitJson } from "../assets/wireless-mouse-sensor-sheet"

// Reuse the checked-in complete sheet imports without moving components or adding errors.
export const realSchematics: {
  name: string
  circuitJson: CircuitJson
  cropToIssues?: boolean
  sheetSvgs?: Record<string, string>
}[] = [
  {
    name: "Wireless mouse — controller",
    circuitJson: wirelessMouseControllerSheetCircuitJson,
  },
  {
    name: "Wireless mouse — sensor",
    circuitJson: wirelessMouseSensorSheetCircuitJson,
  },
  {
    name: "RP2040 BLDC controller — five full sheets",
    circuitJson: rp2040BldcCircuitJson,
    cropToIssues: false,
    sheetSvgs: rp2040BldcSheetSvgs,
  },
]
