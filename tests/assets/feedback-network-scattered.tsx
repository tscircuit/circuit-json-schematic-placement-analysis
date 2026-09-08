import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createFeedbackNetworkScatteredCircuitJson({
  feedbackY = 7,
  capacitorY,
  feedbackInput = "inverting_input",
}: {
  feedbackY?: number
  capacitorY?: number
  feedbackInput?: "inverting_input" | "non_inverting_input"
} = {}): Promise<CircuitJson> {
  const signalInput =
    feedbackInput === "inverting_input"
      ? "non_inverting_input"
      : "inverting_input"
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />
      <opamp name="U1" schX={0} schY={0} />
      {/* The default reproduces the scattered feedback layout. */}
      <resistor name="R1" resistance="100k" schX={0} schY={feedbackY} />
      <resistor
        name="R2"
        resistance="10k"
        schX={-3}
        schY={-2}
        schRotation={90}
      />
      <trace from={`.U1 > .${signalInput}`} to="net.IN" />
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
      <trace from={`.U1 > .${feedbackInput}`} to=".R2 > .pin2" />
      <trace from=".R2 > .pin1" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
