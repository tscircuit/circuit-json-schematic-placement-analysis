import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createFeedbackNetworkScatteredCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />
      <opamp name="U1" schX={0} schY={0} />
      {/* The gain-setting feedback resistor is far outside the amplifier stage. */}
      <resistor name="R1" resistance="100k" schX={0} schY={7} />
      <resistor
        name="R2"
        resistance="10k"
        schX={-3}
        schY={-2}
        schRotation={90}
      />
      <trace from=".U1 > .non_inverting_input" to="net.IN" />
      <trace from=".U1 > .positive_supply" to="net.VCC" />
      <trace from=".U1 > .negative_supply" to="net.GND" />
      <trace from=".U1 > .output" to=".R1 > .pin2" />
      <trace from=".R1 > .pin1" to=".U1 > .inverting_input" />
      <trace from=".U1 > .inverting_input" to=".R2 > .pin2" />
      <trace from=".R2 > .pin1" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
