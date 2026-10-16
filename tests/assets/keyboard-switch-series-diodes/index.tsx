import { Circuit } from "@tscircuit/core"
import Keyboard from "./index.circuit"

export async function createKeyboardSwitchDiodeRepro(
  correctedLayout = false,
  compactMatrix = correctedLayout,
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <Keyboard
      correctedLayout={correctedLayout}
      compactMatrix={compactMatrix}
    />,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
