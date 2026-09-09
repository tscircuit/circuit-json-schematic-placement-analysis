import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createSeriesChainMisalignedCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <resistor name="R1" resistance="100" schX={-4} schY={2} />
      <inductor
        name="L1"
        inductance="10uH"
        schX={0}
        schY={-2}
        schRotation={90}
      />
      <resistor name="R2" resistance="100" schX={4} schY={0} />
      <trace from=".R1 > .pin1" to="net.IN" />
      <trace from=".R1 > .pin2" to=".L1 > .pin1" />
      <trace from=".L1 > .pin2" to=".R2 > .pin1" />
      <trace from=".R2 > .pin2" to="net.OUT" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
