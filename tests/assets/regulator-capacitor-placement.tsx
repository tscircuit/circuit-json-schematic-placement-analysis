import { Circuit } from "@tscircuit/core"

export async function createRegulatorCapacitorPlacement(corrected = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={3}>
      <chip
        name="U1"
        schX={0}
        schY={0}
        pinLabels={{
          pin1: "IN",
          pin2: "GND",
          pin3: "EN",
          pin4: "NC",
          pin5: "OUT",
        }}
        pinAttributes={{
          pin2: { requiresGround: true },
          pin4: { doNotConnect: true },
        }}
      />
      <capacitor
        name="CIN"
        capacitance="4.7uF"
        schOrientation="vertical"
        schX={corrected ? -3.2 : 4.2}
        schY={corrected ? -0.1 : -0.95}
      />
      <capacitor
        name="COUT"
        capacitance="4.7uF"
        schOrientation="vertical"
        schX={corrected ? 3.2 : -4.2}
        schY={corrected ? -0.3 : -0.95}
      />
      <trace name="T1" from=".U1 > .IN" to="net.V5" />
      <trace name="T2" from=".U1 > .EN" to="net.V5" />
      <trace name="T3" from=".U1 > .OUT" to="net.V3V3" />
      <trace name="T4" from=".U1 > .GND" to="net.GND" />
      <trace name="T5" from=".CIN > .pin1" to=".U1 > .IN" />
      <trace name="T6" from=".COUT > .pin1" to=".U1 > .OUT" />
      <trace name="T7" from=".CIN > .pin2" to="net.GND" />
      <trace name="T8" from=".COUT > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
