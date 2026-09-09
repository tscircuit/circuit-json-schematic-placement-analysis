import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createVoltageDividerScatteredCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VIN" isPowerNet />
      <net name="GND" isGroundNet />
      <resistor
        name="R1"
        resistance="100k"
        schX={-5}
        schY={3}
        schRotation={90}
      />
      <resistor
        name="R2"
        resistance="33k"
        schX={3}
        schY={-3}
        schRotation={90}
      />
      <chip
        name="U1"
        schX={3}
        schY={2}
        pinLabels={{ pin1: "ADC" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace from=".R1 > .pin2" to="net.VIN" />
      <trace from=".R1 > .pin1" to=".R2 > .pin2" />
      <trace from=".R2 > .pin2" to=".U1 > .ADC" />
      <trace from=".R2 > .pin1" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
