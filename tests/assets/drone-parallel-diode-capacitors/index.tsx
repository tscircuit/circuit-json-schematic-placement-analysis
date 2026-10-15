import { Circuit } from "@tscircuit/core"
import Drone from "./index.circuit"

export async function createDroneParallelDiodeCapacitorRepro() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Drone />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
