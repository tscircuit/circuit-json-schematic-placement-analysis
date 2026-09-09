import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createHorizontalSignalCapacitorCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <chip
        name="U1"
        schX={-6}
        schY={0}
        pinLabels={{ pin1: "OUT" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <resistor name="R1" resistance="1k" schX={-3.5} schY={0} />
      <capacitor
        name="C1"
        capacitance="100nF"
        schX={0}
        schY={0}
        schOrientation="horizontal"
      />
      <resistor name="R2" resistance="1k" schX={3.5} schY={0} />
      <chip
        name="U2"
        schX={6}
        schY={0}
        pinLabels={{ pin1: "IN" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />

      <trace from=".U1 > .OUT" to=".R1 > .pin1" />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      <trace from=".C1 > .pin2" to=".R2 > .pin1" />
      <trace from=".R2 > .pin2" to=".U2 > .IN" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
