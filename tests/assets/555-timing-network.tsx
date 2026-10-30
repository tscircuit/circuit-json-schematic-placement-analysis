import { Circuit } from "@tscircuit/core"
// Source: https://tscircuit.com/industraveler/555AstableMultivibrator?version=0.0.1
// Release 436223ab-1458-48c6-a313-a24246ce0fcc, index.tsx: all seven components.
// Retains source positions, values, default chip pin layout and pin connections.
// Named rails make the original VCC/GND connectivity explicit in this current-core rebuild.
// orientationOnly fixes existing rotation findings without grouping the timing chain.
export async function create555TimingNetwork(
  orientationOnly = false,
  after = false,
  outputPosition?: { x: number; y: number },
) {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board schLayout={{ layoutMode: "relative" }} schMaxTraceDistance={20}>
      <pinheader
        name="J_PWR"
        pinCount={2}
        footprint="pinrow2"
        schX={after ? -4 : -5}
        schY={2}
        connections={{ pin1: "net.VCC", pin2: "net.GND" }}
      />
      <chip
        name="U1"
        manufacturerPartNumber="LM555"
        footprint="dip8"
        pinLabels={{
          1: "GND",
          2: "TRIG",
          3: "OUT",
          4: "RESET",
          5: "CTRL",
          6: "THRES",
          7: "DISCH",
          8: "VCC",
        }}
        schX={0}
        schY={0}
        connections={{
          pin1: "net.GND",
          pin2: "net.TIMING",
          pin3: "net.OUT",
          pin4: "net.VCC",
          pin5: "net.CTRL",
          pin6: "net.TIMING",
          pin7: "net.DISCH",
          pin8: "net.VCC",
        }}
      />
      <resistor
        name="R1"
        resistance="10k"
        footprint="0805"
        schX={after ? 4 : -2}
        schY={after ? 1.6 : 4}
        schRotation={after || orientationOnly ? -90 : 0}
        connections={{ pin1: "net.VCC", pin2: "net.DISCH" }}
      />
      <resistor
        name="R2"
        resistance="100k"
        footprint="0805"
        schX={after ? 4 : 2}
        schY={after ? -0.4 : 4}
        schRotation={after || orientationOnly ? -90 : 0}
        connections={{ pin1: "net.DISCH", pin2: "net.TIMING" }}
      />
      <capacitor
        name="C1"
        capacitance="10uF"
        footprint="0805"
        schX={after ? 4 : 2}
        schY={after ? -2.4 : -4}
        schRotation={after || orientationOnly ? -90 : 0}
        connections={{ pin1: "net.TIMING", pin2: "net.GND" }}
      />
      <capacitor
        name="C2"
        capacitance="10nF"
        footprint="0805"
        schX={after ? 1.9 : -2}
        schY={after ? -1.8 : -4}
        schRotation={after || orientationOnly ? -90 : 0}
        connections={{ pin1: "net.CTRL", pin2: "net.GND" }}
      />
      <pinheader
        name="J_OUT"
        pinCount={2}
        footprint="pinrow2"
        schX={outputPosition?.x ?? (after ? -4 : 5)}
        schY={outputPosition?.y ?? (after ? -2 : 0)}
        connections={{ pin1: "net.OUT", pin2: "net.GND" }}
      />
      <net name="VCC" isPowerNet />
      <net name="GND" isGroundNet />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
