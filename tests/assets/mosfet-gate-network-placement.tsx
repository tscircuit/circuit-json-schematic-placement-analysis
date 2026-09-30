import { Circuit } from "@tscircuit/core"

export async function createMosfetGateNetworkPlacement({
  grouped = false,
  floating = false,
  native = true,
}: {
  grouped?: boolean
  floating?: boolean
  native?: boolean
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const sourceNet = floating ? "net.PHASE" : "net.GND"
  circuit.add(
    <board schTraceAutoLabelEnabled schMaxTraceDistance={4}>
      {native ? (
        <mosfet
          name="Q1"
          channelType="n"
          mosfetMode="enhancement"
          schX={3}
          schY={0}
        />
      ) : (
        <chip
          name="Q1"
          schX={3}
          schY={0}
          schWidth={1}
          schHeight={1.4}
          pinLabels={{ pin1: "G", pin2: "S", pin3: "D" }}
          schPinArrangement={{
            leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
            bottomSide: { pins: ["pin2"], direction: "left-to-right" },
            topSide: { pins: ["pin3"], direction: "left-to-right" },
          }}
        />
      )}
      <resistor
        name="R_GATE"
        resistance="100"
        schX={grouped ? 0 : -7}
        schY={0}
      />
      <resistor
        name="R_BIAS"
        resistance="100k"
        schX={grouped ? 1.5 : -5.5}
        schY={-1.4}
        schRotation={-90}
      />
      <trace
        name="T_GATE"
        from={`.Q1 > .${native ? "gate" : "G"}`}
        to="net.GATE"
      />
      <trace
        name="T_SOURCE"
        from={`.Q1 > .${native ? "source" : "S"}`}
        to={sourceNet}
      />
      <trace
        name="T_DRAIN"
        from={`.Q1 > .${native ? "drain" : "D"}`}
        to="net.LOAD"
      />
      <trace name="T_DRIVE" from=".R_GATE > .pin1" to="net.DRIVE" />
      <trace name="T_SERIES" from=".R_GATE > .pin2" to="net.GATE" />
      <trace name="T_BIAS_GATE" from=".R_BIAS > .pin1" to="net.GATE" />
      <trace name="T_BIAS_SOURCE" from=".R_BIAS > .pin2" to={sourceNet} />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
