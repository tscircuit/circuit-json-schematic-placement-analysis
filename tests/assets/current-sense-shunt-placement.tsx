import { Circuit } from "@tscircuit/core"

export async function createCurrentSenseShuntPlacement(
  layout: "displaced" | "beside-inputs" | "horizontal-direct" = "displaced",
) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schTraceAutoLabelEnabled
      schMaxTraceDistance={layout === "horizontal-direct" ? 100 : 6}
    >
      <resistor
        name="RSHUNT"
        resistance="100m"
        schX={layout === "beside-inputs" ? -3 : 0}
        schY={layout === "beside-inputs" ? 0 : 5}
        schRotation={layout === "beside-inputs" ? 270 : 0}
      />
      <chip
        name="U1"
        schX={0}
        schY={0}
        schWidth={2}
        schHeight={1.71}
        schPinStyle={{
          pin1: { marginTop: 0.65 },
          pin4: { marginTop: 0.65 },
          pin7: { marginLeft: 0.3 },
          pin3: { marginLeft: 0.3 },
        }}
        pinLabels={{
          pin1: "IN_NEG",
          pin2: "GND",
          pin3: "REF2",
          pin4: "NC",
          pin5: "OUT",
          pin6: "VS",
          pin7: "REF1",
          pin8: "IN_POS",
        }}
        schPinArrangement={{
          leftSide: { pins: [8, 1], direction: "top-to-bottom" },
          rightSide: { pins: [5, 4], direction: "top-to-bottom" },
          topSide: { pins: [6, 7, 3], direction: "left-to-right" },
          bottomSide: { pins: [2], direction: "left-to-right" },
        }}
      />
      <trace
        name="T1"
        from=".RSHUNT > .pin1"
        to=".U1 > .IN_POS"
        schDisplayLabel="DRIVE"
      />
      <trace
        name="T2"
        from=".RSHUNT > .pin2"
        to=".U1 > .IN_NEG"
        schDisplayLabel="WINDING"
      />
      <trace name="T3" from=".U1 > .VS" to="net.V3V3" />
      <trace name="T4" from=".U1 > .REF1" to="net.V3V3" />
      <trace name="T5" from=".U1 > .REF2" to="net.GND" />
      <trace name="T6" from=".U1 > .GND" to="net.GND" />
      <trace name="T7" from=".U1 > .NC" to="net.GND" />
      <trace name="T8" from=".U1 > .OUT" to="net.CURRENT" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
