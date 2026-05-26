import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createVerboseNetLabelFixedCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm" schAutoLayoutEnabled>
      <resistor
        resistance="1k"
        footprint="0402"
        name="R1"
        schX="-1.9"
        schY="1.7"
      />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="C1"
        schX="0.27"
        schY="2.1"
        connections={{ pin1: "R1.pin1" }}
      />
      <chip
        footprint="soic8"
        name="U1"
        schX="0.92"
        schY="0"
        connections={{ pin1: "C1.pin2", pin2: "R1.pin2" }}
      />
      <chip
        footprint="soic8"
        name="U2"
        schX="-2.36"
        schY="-0.4"
        connections={{ pin1: "U1.pin3", pin2: "U1.pin4" }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
