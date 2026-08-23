import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createTraceSimplificationCircuitJson({
  addBlockingComponent = false,
}: {
  addBlockingComponent?: boolean
} = {}): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U3"
        footprint="soic8"
        schX={0}
        schY={0}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <resistor
        name="R11"
        resistance="100k"
        footprint="0603"
        schX={0}
        schY={2}
        schRotation={90}
      />
      {addBlockingComponent && (
        <resistor
          name="R12"
          resistance="1k"
          footprint="0603"
          schX={0.8}
          schY={2}
          schRotation={90}
        />
      )}
      <trace from=".U3 > .pin1" to=".R11 > .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
