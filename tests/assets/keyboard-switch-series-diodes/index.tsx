import { Circuit } from "@tscircuit/core"
import Keyboard from "./index.circuit"

export async function createKeyboardSwitchDiodeRepro(
  groupedMatrixDiodes = false,
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<Keyboard groupedMatrixDiodes={groupedMatrixDiodes} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
