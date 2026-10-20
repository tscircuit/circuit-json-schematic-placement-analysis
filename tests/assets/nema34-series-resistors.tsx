import React from "react"
import { Circuit } from "@tscircuit/core"
// Real-board functional network extract: https://tscircuit.com/techmannih/nema34-mounted-stepper-controller?version=0.3.92#schematic
// Release f9c7a51c-0362-489e-94d3-5901eb27ba81; source index.circuit.tsx.
// Published positions, pin-to-net connections, values and native symbols are retained.
// Only the 4 parts in this network are included; the board outside its named
// boundary nets, PCB placement and sheet frames are omitted. This is not a full-board repro.
// The correction changes placement/orientation and allows local direct wires up to
// five schematic units. It never edits generated Circuit JSON or electrical metadata.
function Network({ after }: { after: boolean }) {
  return (
    <>
      <net name="VMOTOR" isPowerNet nominalTraceWidth="2.4mm" />
      <net name="VMON_MID" isPowerNet={false} />
      <net name="VMON_ADC" isPowerNet={false} />
      <resistor
        name="R31"
        schX={7.42}
        schY={-3.45}
        schRotation={-90}
        resistance="180k"
        footprint="0603"
        supplierPartNumbers={{ jlcpcb: ["C22827"] }}
        connections={{ pin1: "net.VMOTOR", pin2: "net.VMON_MID" }}
      />
      <resistor
        name="R32"
        schX={after ? 7.42 : 10.75}
        schY={after ? -5.05 : -4.45}
        schRotation={after ? -90 : 0}
        resistance="180k"
        footprint="0603"
        supplierPartNumbers={{ jlcpcb: ["C22827"] }}
        connections={{ pin1: "net.VMON_MID", pin2: "net.VMON_ADC" }}
      />
      <resistor
        name="R33"
        schX={after ? 7.42 : 9.55}
        schY={after ? -7.05 : -6.25}
        schRotation={-90}
        resistance="20k"
        footprint="0603"
        supplierPartNumbers={{ jlcpcb: ["C4184"] }}
        connections={{ pin1: "net.VMON_ADC", pin2: "net.GND" }}
      />
      <capacitor
        name="C24"
        schX={after ? 10 : 11.25}
        schY={after ? -7.05 : -7.95}
        schRotation={-90}
        capacitance="100nF"
        footprint="0603"
        supplierPartNumbers={{ jlcpcb: ["C14663"] }}
        maxDecouplingTraceLength="30mm"
        maxVoltageRating="50V"
        connections={{ pin1: "net.VMON_ADC", pin2: "net.GND" }}
      />
    </>
  )
}

export async function createNema34SeriesResistors(after = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={after ? 5 : undefined}
    >
      <Network after={after} />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
