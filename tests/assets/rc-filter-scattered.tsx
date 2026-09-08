import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createRcFilterScatteredCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="GND" isGroundNet />
      <chip
        name="U1"
        schX={-5}
        schY={2}
        pinLabels={{ pin1: "OUT" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <resistor name="R1" resistance="1k" schX={-2} schY={2} />
      <chip
        name="U2"
        schX={3}
        schY={2}
        pinLabels={{ pin1: "ADC" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        schX={-5}
        schY={-4}
        schOrientation="vertical"
      />
      <trace from=".U1 > .OUT" to=".R1 > .pin1" />
      <trace from=".R1 > .pin2" to=".U2 > .ADC" />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      <trace from=".C1 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
