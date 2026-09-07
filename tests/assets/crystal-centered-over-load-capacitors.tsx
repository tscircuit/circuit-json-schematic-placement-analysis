import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createCrystalCenteredOverLoadCapacitorsCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled>
      <chip
        name="U1"
        pinLabels={{
          pin1: "OSC1",
          pin2: "OSC2",
          pin3: "VCC",
          pin4: "GND",
        }}
        schX={0}
        schY={3}
      />
      <crystal
        name="X1"
        frequency="16MHz"
        loadCapacitance="12pF"
        footprint="pinrow2_p2.54"
        schX={0}
        schY={0.55}
      />
      <capacitor
        name="C1"
        capacitance="18pF"
        footprint="0402"
        schX={-2}
        schY={0}
        schOrientation="vertical"
      />
      <capacitor
        name="C2"
        capacitance="18pF"
        footprint="0402"
        schX={2}
        schY={0}
        schOrientation="vertical"
      />

      <trace from=".U1 > .OSC1" to="net.XC1" />
      <trace from=".X1 > .pin1" to="net.XC1" />
      <trace from=".C1 > .pin1" to="net.XC1" />
      <trace from=".U1 > .OSC2" to="net.XC2" />
      <trace from=".X1 > .pin2" to="net.XC2" />
      <trace from=".C2 > .pin1" to="net.XC2" />
      <trace from=".C1 > .pin2" to="net.GND" />
      <trace from=".C2 > .pin2" to="net.GND" />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
