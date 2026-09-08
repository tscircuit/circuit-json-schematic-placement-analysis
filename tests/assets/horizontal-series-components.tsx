import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createHorizontalSeriesComponentsCircuitJson(): Promise<CircuitJson> {
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
      <inductor name="L3" inductance="10uH" schX={0} schY={2} />
      <chip
        name="U2"
        schX={3}
        schY={2}
        pinLabels={{ pin1: "IN" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace from=".U1 > .OUT" to=".L3 > .pin1" />
      <trace from=".L3 > .pin2" to=".U2 > .IN" />

      {/* Both D4 ends supply power; this is a series feed, not a pull branch. */}
      <net name="VCC" isPowerNet />
      <diode name="D4" schX={0} schY={-2} />
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
      <trace from="net.VCC" to=".D4 > .pin1" />
      <trace from=".D4 > .pin2" to=".U3 > .VDD" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
