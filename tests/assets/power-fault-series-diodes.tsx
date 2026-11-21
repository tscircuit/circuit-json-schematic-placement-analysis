// Published source: https://tscircuit.com/coder-ari/power-fault-detector?version=0.0.1#schematic
// Release 32a0c13f-b6b0-40ca-8936-d503d0cf09d2; components/protection.tsx.
// Only J1 and its two-Zener clamp are included. The ADC and RC stages are outside
// these boundary nets. Values, native symbols, pin arrangement and polarity are retained.
import { Circuit } from "@tscircuit/core"
// Three-component input clamp extract from coder-ari/power-fault-detector.
// Before coordinates and symbols match the published Circuit JSON.
export default function PowerFaultSeriesDiodes() {
  return (
    <board
      routingDisabled
      schTraceAutoLabelEnabled={false}
      schMaxTraceDistance={40}
    >
      <pinheader
        name="J1"
        pinCount={2}
        pitch="5.08mm"
        pinLabels={["VA", "HILCOM"]}
        schPinArrangement={{
          rightSide: { direction: "top-to-bottom", pins: [1, 2] },
        }}
        schX={0.1175000000000006}
        schY={-9.59999999999999}
        schWidth={1.7}
        schHeight={0.6}
        connections={{ pin1: "net.AIN1_RAW", pin2: "net.HILCOM" }}
      />
      <diode
        name="D302"
        zener
        footprint="sod123"
        schX={3.0966471000000007}
        schY={-9.500512299999992}
        schRotation={0}
        connections={{ anode: "net.AIN1_RAW", cathode: "net.TVSMID1" }}
      />
      <diode
        name="D303"
        zener
        footprint="sod123"
        schX={2.6916471000000004}
        schY={-11.316103899999991}
        schRotation={0}
        connections={{ anode: "net.HILCOM", cathode: "net.TVSMID1" }}
      />
    </board>
  )
}
export async function createPowerFaultSeriesDiodes() {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(<PowerFaultSeriesDiodes />)
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
