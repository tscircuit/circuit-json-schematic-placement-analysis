import { Circuit } from "@tscircuit/core"

export async function createPassiveTraceMovement(
  name: string,
  blocked = false,
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      {name.startsWith("C") ? (
        <capacitor name={name} capacitance="100nF" schX={0} schY={0} />
      ) : (
        <resistor name={name} resistance="1k" schX={0} schY={0} />
      )}
      <chip
        name="U1"
        footprint="soic8"
        pinLabels={{ pin1: "IN" }}
        schX={0}
        schY={2}
        schPinArrangement={{
          bottomSide: { pins: ["pin1"], direction: "left-to-right" },
        }}
      />
      {blocked && (
        <chip name="U2" schX={-0.8} schY={0} schWidth={0.4} schHeight={0.4} />
      )}
      <trace from={`.${name} > .pin2`} to=".U1 > .pin1" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
