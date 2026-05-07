import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board>
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />

      <diode name="D1" footprint="0603" schX={0} schY={0} />
      <resistor name="R1" resistance="1k" footprint="0603" schX={0} schY={2} />

      <trace from=".D1 > .pin2" to=".R1 > .pin1" />
      <trace from=".D1 > .pin1" to="net.VCC" />
      <trace from=".R1 > .pin2" to="net.GND" />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
