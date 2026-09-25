import { Circuit } from "@tscircuit/core"

export async function createVoltageDividerPlacement(corrected = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={3}>
      <resistor
        name="RTOP"
        resistance="10k"
        schRotation={270}
        schX={corrected ? 1 : -2}
        schY={corrected ? 4.5 : -3}
      />
      <resistor
        name="RBOT"
        resistance="68k"
        schRotation={270}
        schX={1}
        schY={2}
      />
      <chip
        name="U1"
        schX={5}
        schY={1}
        pinLabels={{ pin1: "ADC" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace name="T1" from=".RTOP > .pin1" to="net.V12" />
      <trace name="T2" from=".RTOP > .pin2" to="net.SENSE" />
      <trace name="T3" from=".RBOT > .pin1" to="net.SENSE" />
      <trace name="T4" from=".RBOT > .pin2" to="net.GND" />
      <trace name="T5" from=".U1 > .ADC" to="net.SENSE" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
