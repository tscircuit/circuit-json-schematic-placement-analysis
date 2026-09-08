import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createRailConnectedTwoPinComponentsCircuitJson({
  vertical = false,
}: {
  vertical?: boolean
} = {}): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const schRotation = vertical ? 270 : 0
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={2}>
      <net name="VCC" isPowerNet />
      <net name="VREF" isPowerNet />
      <net name="VDD" isPowerNet />
      <net name="GND" isGroundNet />
      <net name="AGND" isGroundNet />
      <net name="RF_GND" isGroundNet />
      <net name="DGND" isGroundNet />
      <capacitor
        name="C1"
        capacitance="100nF"
        schX={-6}
        schY={3}
        schRotation={schRotation}
      />
      <diode name="D1" schX={0} schY={3} schRotation={vertical ? 270 : 180} />
      <inductor
        name="L1"
        inductance="10uH"
        schX={6}
        schY={3}
        schRotation={schRotation}
      />
      <capacitor
        name="C2"
        capacitance="1uF"
        polarized
        schX={-6}
        schY={-3}
        schRotation={schRotation}
      />
      <resistor
        name="R0"
        resistance="0"
        schX={0}
        schY={-3}
        schRotation={schRotation}
      />
      <led name="LED1" schX={6} schY={-3} schRotation={vertical ? 270 : 180} />

      <trace from=".C1 > .pin1" to="net.FILTER" />
      <trace from=".C1 > .pin2" to="net.AGND" />
      <trace from=".D1 > .pin1" to="net.VREF" />
      <trace from=".D1 > .pin2" to="net.CLAMP" />
      <trace from=".L1 > .pin1" to="net.RF" />
      <trace from=".L1 > .pin2" to="net.RF_GND" />
      <trace from=".C2 > .pin1" to="net.VDD" />
      <trace from=".C2 > .pin2" to="net.GND" />
      <trace from=".R0 > .pin1" to="net.VCC" />
      <trace from=".R0 > .pin2" to="net.LINK" />
      <trace from=".LED1 > .pin1" to="net.LED" />
      <trace from=".LED1 > .pin2" to="net.DGND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
