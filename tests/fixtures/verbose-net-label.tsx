import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createVerboseNetLabelCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1" />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="C1"
        connections={{ pin1: "R1.pin1" }}
      />
      <chip
        footprint="soic8"
        name="U1"
        connections={{ pin1: "C1.pin2", pin2: "R1.pin2" }}
      />
      <chip
        footprint="soic8"
        name="U2"
        connections={{ pin1: "U1.pin3", pin2: "U1.pin4" }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
