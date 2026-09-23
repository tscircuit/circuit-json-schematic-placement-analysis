import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createUsbSeriesResistorPair(
  nearby = false,
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <chip
        name="U1"
        schX={-7}
        pinLabels={{ pin1: "USB_DP", pin2: "USB_DM", pin3: "NC" }}
        schPinArrangement={{
          rightSide: {
            pins: ["pin1", "pin2", "pin3"],
            direction: "top-to-bottom",
          },
        }}
      />
      <chip
        name="J1"
        schX={7}
        pinLabels={{ pin1: "DP", pin2: "DM", pin3: "NC" }}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin2", "pin3"],
            direction: "top-to-bottom",
          },
        }}
      />
      <resistor
        name="RP"
        resistance="27"
        schX={nearby ? 0 : -3}
        schY={nearby ? 1.2 : 0}
      />
      <resistor
        name="RN"
        resistance="27"
        schX={nearby ? 0.8 : 3}
        schY={nearby ? -1.2 : 0}
      />
      <trace from=".U1 > .USB_DP" to=".RP > .pin1" />
      <trace from=".U1 > .USB_DM" to=".RN > .pin1" />
      <trace from=".RP > .pin2" to=".J1 > .pin1" />
      <trace from=".RN > .pin2" to=".J1 > .pin2" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
