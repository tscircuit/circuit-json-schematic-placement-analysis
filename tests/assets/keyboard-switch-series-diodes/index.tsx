import { Circuit } from "@tscircuit/core"
import Keyboard from "./index.circuit"

export async function createKeyboardSwitchDiodeRepro(correctedLayout = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Keyboard correctedLayout={correctedLayout} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
