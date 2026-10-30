// Native output extract from https://tscircuit.com/industraveler/555AstableMultivibrator?version=0.0.1
// Release 436223ab-1458-48c6-a313-a24246ce0fcc. Original U1/J_OUT pin layouts, positions and output/ground connectivity.
// Other timing and supply branches are outside this two-component extract.
import { Circuit } from "@tscircuit/core"
export async function create555OutputConnector(position = { x: 5, y: 0 }) {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board schLayout={{ layoutMode: "relative" }} schMaxTraceDistance={20}>
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
        connections={{ pin1: "net.GND", pin3: "net.OUT" }}
      />
      <pinheader
        name="J_OUT"
        pinCount={2}
        footprint="pinrow2"
        schX={position.x}
        schY={position.y}
        connections={{ pin1: "net.OUT", pin2: "net.GND" }}
      />
      <net name="GND" isGroundNet />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
