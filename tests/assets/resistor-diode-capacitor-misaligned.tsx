import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board>
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />

      <resistor name="R1" resistance="1k" footprint="0603" schX={0} schY={0} />
      <diode name="D1" footprint="0603" schX={0} schY={2} />
      <capacitor
        name="C1"
        capacitance="1uF"
        footprint="0603"
        schX={2}
        schY={2}
      />

      <trace from=".R1 > .pin2" to=".D1 > .pin1" />
      <trace from=".D1 > .pin2" to=".C1 > .pin1" />
      <trace from=".R1 > .pin1" to="net.VCC" />
      <trace from=".C1 > .pin2" to="net.GND" />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
