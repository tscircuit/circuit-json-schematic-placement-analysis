import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createWireTextCollisionCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <chip
        name="U1"
        schX={-4}
        schY={0}
        pinLabels={{ pin1: "OUT" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <chip
        name="U2"
        schX={4}
        schY={0}
        pinLabels={{ pin1: "IN" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace from=".U1 > .OUT" to=".U2 > .IN" />
      {/* Large text extends beyond the router's small text obstacle. */}
      <schematictext
        text="ANALOG INPUT"
        fontSize={0.6}
        schX={0}
        schY={-0.25}
        anchor="center"
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
