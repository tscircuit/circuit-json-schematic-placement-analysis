import { Circuit } from "@tscircuit/core"
import Drone, { type DronePlacement } from "./index.circuit"

export async function createDroneParallelDiodeCapacitorRepro(
  placements: Record<string, DronePlacement> = {},
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Drone placements={placements} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
