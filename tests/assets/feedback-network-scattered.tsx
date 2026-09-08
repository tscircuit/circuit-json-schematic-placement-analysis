import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createFeedbackNetworkScatteredCircuitJson({
  feedbackX = 0,
  feedbackY = 7,
  amplifierRotation = 0,
  capacitorY,
  feedbackInput = "inverting_input",
}: {
  feedbackX?: number
  feedbackY?: number
  amplifierRotation?: number
  capacitorY?: number
  feedbackInput?: "inverting_input" | "non_inverting_input"
} = {}): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />
      <opamp name="U1" schX={0} schY={0} schRotation={amplifierRotation} />
      {/* The default reproduces the scattered feedback layout. */}
      <resistor name="R1" resistance="100k" schX={feedbackX} schY={feedbackY} />
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
      <trace from=".R1 > .pin1" to={`.U1 > .${feedbackInput}`} />
      {capacitorY !== undefined && (
        <>
          <capacitor name="C1" capacitance="100pF" schX={0} schY={capacitorY} />
          <trace from=".C1 > .pin1" to=".R1 > .pin1" />
          <trace from=".C1 > .pin2" to=".R1 > .pin2" />
        </>
      )}
      <trace from=".U1 > .inverting_input" to=".R2 > .pin2" />
      <trace from=".R2 > .pin1" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
