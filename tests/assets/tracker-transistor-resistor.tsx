import React from "react"
import { Circuit } from "@tscircuit/core"

// Real-board PWRKEY network extract:
// https://tscircuit.com/pixalynx/esp32-gps-cellular-tracker?version=1.1.0#schematic
// Release 07c03b8c-2342-4e81-9c01-270e92a519be; index.circuit.tsx, Q1/R12/R13.
// Original part positions, native symbols, values and connections are retained.
// U5.IO4 and U7.PWRKEY are boundary nets here; the remaining board, PCB layout
// and section frames are omitted. This is a three-part extract, not a full board.
// Corrections change schematic placement/rotation and local wire distance only.
export async function createTrackerTransistorResistor(
  state: "before" | "orientation-only" | "after" = "before",
) {
  const after = state === "after"
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={after ? 5 : undefined}
    >
      <transistor
        name="Q1"
        type="npn"
        footprint="sot23"
        supplierPartNumbers={{ jlcpcb: ["C20526"] }}
        schX={8}
        schY={-17}
        schRotation={after ? -90 : 0}
      />
      <resistor
        name="R12"
        resistance="10k"
        footprint="0402"
        schX={after ? 6 : 4}
        schY={after ? -17 : -17.675}
      />
      <resistor
        name="R13"
        resistance="10k"
        footprint="0402"
        schX={after ? 8.29 : 8}
        schY={-15}
        schRotation={state === "before" ? 0 : 90}
      />
      <trace from="net.U5_IO4" to="R12.pin1" />
      <trace from="R12.pin2" to="Q1.base" />
      <trace from="Q1.emitter" to="net.GND" />
      <trace from="Q1.collector" to="net.U7_PWRKEY" />
      <trace from="net.U7_PWRKEY" to="R13.pin1" />
      <trace from="R13.pin2" to="net.VSYS" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
