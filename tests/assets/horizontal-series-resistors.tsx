import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createHorizontalSeriesResistorsCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <chip
        name="U1"
        schX={-3}
        schY={2}
        pinLabels={{ pin1: "OUT" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <resistor name="R3" resistance="33" schX={0} schY={2} />
      <chip
        name="U2"
        schX={3}
        schY={2}
        pinLabels={{ pin1: "IN" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace from=".U1 > .OUT" to=".R3 > .pin1" />
      <trace from=".R3 > .pin2" to=".U2 > .IN" />

      {/* Both R4 ends supply power; this is a series feed, not a pull branch. */}
      <net name="VCC" isPowerNet />
      <resistor name="R4" resistance="10" schX={0} schY={-2} />
      <chip
        name="U3"
        schX={3}
        schY={-2}
        pinLabels={{ pin1: "VDD" }}
        pinAttributes={{ VDD: { requiresPower: true } }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace from="net.VCC" to=".R4 > .pin1" />
      <trace from=".R4 > .pin2" to=".U3 > .VDD" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
