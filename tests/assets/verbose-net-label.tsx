import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createVerboseNetLabelCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor resistance="1k" footprint="0402" name="R1" />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="C1"
        connections={{ pin1: "R1.pin1" }}
      />
      <chip footprint="soic8" name="U1" connections={{ pin1: "C1.pin2" }} />
      <chip
        footprint="soic8"
        name="U2"
        connections={{ pin1: "U1.pin3", pin2: "U1.pin4" }}
      />
      {/* Keep the legacy verbose label explicit now that core generates shorter labels. */}
      <trace
        from=".R1 .pin2"
        to=".U1 .pin2"
        schDisplayLabel="R1_pin2/U1_pin2"
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
