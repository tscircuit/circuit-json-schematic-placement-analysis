import type { CircuitJson } from "circuit-json"
import { rp2040BldcCircuitJson } from "../assets/rp2040-bldc-controller"
import { wirelessMouseControllerSheetCircuitJson } from "../assets/wireless-mouse-controller-sheet"
import { wirelessMouseSensorSheetCircuitJson } from "../assets/wireless-mouse-sensor-sheet"
import { trellisCoreCircuitJson } from "../assets/trellis-core"
import { museviewCircuitJson } from "../assets/museview"
import acousticGuitarTunerCircuitJson from "../assets/acoustic-guitar-tuner.circuit.json"

// Reuse the checked-in complete sheet imports without moving components or adding errors.
export const realSchematics: {
  name: string
  circuitJson: CircuitJson
  showFullSchematic?: boolean
}[] = [
  {
    name: "Acoustic guitar tuner — full-sheet crop repro",
    circuitJson: acousticGuitarTunerCircuitJson as CircuitJson,
  },
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
    showFullSchematic: true,
  },
  {
    name: "Trellis Core — all five sheets (v0.2.9)",
    circuitJson: trellisCoreCircuitJson,
  },
  {
    name: "Museview — all four sheets (v0.1.9)",
    circuitJson: museviewCircuitJson,
    showFullSchematic: true,
  },
]
