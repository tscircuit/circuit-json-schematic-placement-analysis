import { Circuit } from "@tscircuit/core"

export async function createRelayFlybackDiodePlacement(grouped = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={3}>
      <chip
        name="K1"
        schX={0}
        schY={0}
        schWidth={1.7}
        schHeight={0.6}
        pinLabels={{
          pin1: "COIL_A",
          pin2: "COIL_B",
          pin3: "COM",
          pin4: "NO",
          pin5: "NC",
        }}
        schPinArrangement={{
          leftSide: { pins: ["pin2", "pin1"], direction: "top-to-bottom" },
          rightSide: {
            pins: ["pin3", "pin4", "pin5"],
            direction: "top-to-bottom",
          },
        }}
      />
      <chip
        name="Q1"
        schX={-5}
        schY={-2}
        schWidth={1.5}
        schHeight={1}
        pinLabels={{
          pin1: ["C", "collector"],
          pin2: ["E", "emitter"],
          pin3: ["B", "base"],
        }}
        schPinArrangement={{
          topSide: { pins: ["pin1"], direction: "left-to-right" },
          bottomSide: { pins: ["pin2"], direction: "left-to-right" },
          leftSide: { pins: ["pin3"], direction: "top-to-bottom" },
        }}
      />
      <chip
        name="J1"
        schX={-5}
        schY={2}
        pinLabels={{ pin1: "SUPPLY" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <diode
        name="D1"
        schX={grouped ? -2.5 : 0}
        schY={grouped ? 0 : 5}
        schRotation={90}
      />
      <trace name="COIL_SWITCH" from=".K1 > .COIL_A" to=".Q1 > .collector" />
      <trace name="T2" from=".D1 > .anode" to=".K1 > .COIL_A" />
      <trace name="RELAY_SUPPLY" from=".D1 > .cathode" to=".K1 > .COIL_B" />
      <trace name="T4" from=".K1 > .COIL_B" to=".J1 > .SUPPLY" />
      <trace name="T5" from=".Q1 > .emitter" to="net.GND" />
      <trace name="T6" from=".Q1 > .base" to="net.CONTROL" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
