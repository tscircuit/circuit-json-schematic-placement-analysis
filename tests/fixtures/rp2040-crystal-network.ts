import type { CircuitJson } from "circuit-json"
import network from "../assets/rp2040-crystal-load-network.circuit.json"

/** Extracted from imrishabh18/rp2040-motor-controller v1.0.41. */
export const createRp2040CrystalNetwork = (): CircuitJson =>
  structuredClone(network) as CircuitJson

export function moveCrystal(circuitJson: CircuitJson, x: number, y: number) {
  const crystal = circuitJson.find(
    (e) =>
      e.type === "schematic_component" &&
      e.source_component_id === "source_component_16",
  )!
  if (crystal.type !== "schematic_component") throw new Error("Missing crystal")
  const dx = x - crystal.center.x
  const dy = y - crystal.center.y
  crystal.center = { x, y }
  for (const e of circuitJson) {
    if (
      e.type === "schematic_port" &&
      e.schematic_component_id === crystal.schematic_component_id
    ) {
      e.center.x += dx
      e.center.y += dy
    }
  }
}
