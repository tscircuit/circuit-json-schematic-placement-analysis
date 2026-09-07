import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createDecouplingCapacitorsNotCloseCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="40mm" height="40mm">
      <chip
        name="U1"
        footprint="soic8"
        schX={0}
        schY={0}
        pinLabels={{
          pin1: "VCC",
          pin2: "GND",
        }}
        connections={{
          pin1: "net.VCC",
          pin2: "net.GND",
        }}
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        footprint="0402"
        schX={-10}
        schY={8}
        schOrientation="vertical"
        decouplingFor=".U1 > .VCC"
        decouplingTo="net.GND"
      />
      <capacitor
        name="C2"
        capacitance="10uF"
        footprint="0603"
        schX={10}
        schY={-8}
        schOrientation="vertical"
        decouplingFor=".U1 > .VCC"
        decouplingTo="net.GND"
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
