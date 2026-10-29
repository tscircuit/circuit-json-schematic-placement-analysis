// Output filter extracted from hrithik18k/quad-sensor-conditioner v1.0.1.
// Exact R21/C31/JO1 values, placements and pin connections; other channels omitted.
import { Circuit } from "@tscircuit/core"
export async function createGroundedSignalBranch(after = false) {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board schLayout={{ layoutMode: "relative" }}>
      <resistor
        name="R21"
        resistance="100"
        footprint="0805"
        schX={-22.7}
        schY={5.5}
        connections={{ pin1: "net.BUFFER1", pin2: "net.OUT1" }}
      />
      <capacitor
        name="C31"
        capacitance="10nF"
        footprint="0805"
        schX={-20.45}
        schY={after ? 4.7 : 5.5}
        schRotation={after ? -90 : 90}
        connections={{ pin1: "net.OUT1", pin2: "net.GND" }}
      />
      <pinheader
        name="JO1"
        pinCount={2}
        footprint="pinrow2"
        schX={-18.2}
        schY={5.5}
        pinLabels={["OUT", "GND"]}
        connections={{ pin1: "net.OUT1", pin2: "net.GND" }}
      />
      <net name="GND" isGroundNet />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
