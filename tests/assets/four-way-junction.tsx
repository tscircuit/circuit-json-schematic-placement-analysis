import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createFourWayJunctionCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <resistor name="R1" resistance="1k" schX={-3} schY={0} />
      <resistor name="R2" resistance="2k" schX={3} schY={0} />
      <resistor name="R3" resistance="3k" schX={0} schY={3} schRotation={90} />
      <resistor name="R4" resistance="4k" schX={0} schY={-3} schRotation={90} />
      <trace from=".R1 > .pin1" to="net.LEFT" />
      <trace from=".R2 > .pin2" to="net.RIGHT" />
      <trace from=".R3 > .pin2" to="net.TOP" />
      <trace from=".R4 > .pin1" to="net.BOTTOM" />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
      <trace from=".R3 > .pin1" to=".R4 > .pin2" />
      <trace from=".R1 > .pin2" to=".R3 > .pin1" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
