import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createSignalFlowReversedCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      {/* UART TX/RX pin hints make the intended signal direction explicit. */}
      <chip
        name="U1"
        schX={4}
        schY={0}
        pinLabels={{ pin1: "TX" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <chip
        name="U2"
        schX={-4}
        schY={0}
        pinLabels={{ pin1: "RX" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace from=".U1 > .TX" to=".U2 > .RX" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
