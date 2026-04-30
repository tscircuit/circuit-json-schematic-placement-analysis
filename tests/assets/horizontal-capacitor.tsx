import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createHorizontalCapacitorCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <capacitor
        name="C1"
        capacitance="1uF"
        footprint="0402"
        schX={0}
        schY={0}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
