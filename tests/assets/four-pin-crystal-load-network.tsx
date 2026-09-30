import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createFourPinCrystalLoadNetwork(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true

  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <chip
        name="U1"
        pinLabels={{
          pin1: "X1",
          pin2: "X2",
          pin3: "V",
          pin4: "GND",
        }}
        schPinArrangement={{
          rightSide: {
            pins: ["pin1", "pin2"],
            direction: "top-to-bottom",
          },
          topSide: { pins: ["pin3"], direction: "left-to-right" },
          bottomSide: { pins: ["pin4"], direction: "left-to-right" },
        }}
        schX={-4}
        schWidth={0.8}
        schHeight={0.6}
      />
      {/* Four-pin crystal: A/B are signals and G1/G2 are grounded case pins. */}
      <chip
        name="Y1"
        pinLabels={{
          pin1: "A",
          pin2: "G1",
          pin3: "B",
          pin4: "G2",
        }}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin3"],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: ["pin2", "pin4"],
            direction: "top-to-bottom",
          },
        }}
        schX={1.5}
        schWidth={0.8}
        schHeight={0.6}
      />
      <capacitor
        name="C1"
        capacitance="12pF"
        schX={-1}
        schY={-2}
        schOrientation="vertical"
      />
      <capacitor
        name="C2"
        capacitance="12pF"
        schX={1}
        schY={-2}
        schOrientation="vertical"
      />

      <trace from=".U1 > .X1" to=".Y1 > .A" />
      <trace from=".C1 > .pin1" to=".Y1 > .A" />
      <trace from=".U1 > .X2" to=".Y1 > .B" />
      <trace from=".C2 > .pin1" to=".Y1 > .B" />
      <trace from=".U1 > .V" to="net.VCC" />
      <trace from=".U1 > .GND" to="net.GND" />
      <trace from=".Y1 > .G1" to="net.GND" />
      <trace from=".Y1 > .G2" to="net.GND" />
      <trace from=".C1 > .pin2" to="net.GND" />
      <trace from=".C2 > .pin2" to="net.GND" />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
