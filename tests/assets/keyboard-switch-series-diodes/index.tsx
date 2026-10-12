import { Circuit } from "@tscircuit/core"
import Keyboard from "./index.circuit"

export async function createKeyboardSwitchDiodeRepro() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Keyboard />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
