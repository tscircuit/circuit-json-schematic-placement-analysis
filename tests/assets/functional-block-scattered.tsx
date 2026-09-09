import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createFunctionalBlockScatteredCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />
      <chip
        name="U1"
        schX={5}
        schY={0}
        pinLabels={{ pin1: "RESET_N", pin2: "GPIO" }}
        pinAttributes={{ RESET_N: { needsExternalPullup: true } }}
        schPinArrangement={{
          leftSide: { pins: ["pin1", "pin2"], direction: "top-to-bottom" },
        }}
      />
      <resistor
        name="R1"
        resistance="10k"
        schX={-6}
        schY={2}
        schRotation={90}
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        schX={-6}
        schY={-2}
        schOrientation="vertical"
      />
      <chip
        name="U2"
        schX={0}
        schY={-2}
        pinLabels={{ pin1: "SDA", pin2: "SCL" }}
        connections={{ SDA: "net.SDA", SCL: "net.SCL" }}
      />
      <trace from=".R1 > .pin2" to="net.VCC" />
      <trace from=".R1 > .pin1" to=".C1 > .pin1" />
      <trace from=".C1 > .pin1" to=".U1 > .RESET_N" />
      <trace from=".C1 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
