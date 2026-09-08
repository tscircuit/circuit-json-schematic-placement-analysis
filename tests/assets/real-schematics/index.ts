import type { CircuitJson } from "circuit-json"
import wirelessMouse from "./wireless-mouse-pcb.json"
import rp2040 from "./rp2040-bldc-controller.json"
import pedometer from "./pedometer.json"
import provenance from "./provenance.json"

// Frozen exports, not TSX rebuilds. See provenance for source paths and hashes.
export const realSchematics = [
  { name: "Wireless mouse", circuitJson: wirelessMouse },
  { name: "RP2040 BLDC controller", circuitJson: rp2040 },
  { name: "Pedometer", circuitJson: pedometer },
].map((fixture, index) => ({
  ...fixture,
  circuitJson: fixture.circuitJson as unknown as CircuitJson,
  provenance: provenance.fixtures[index]!,
}))
