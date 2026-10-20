import React from "react"
import { Circuit } from "@tscircuit/core"

// Real-board NETLIGHT network extract:
// https://tscircuit.com/pixalynx/esp32-gps-cellular-tracker?version=1.1.0#schematic
// Release 07c03b8c-2342-4e81-9c01-270e92a519be; index.circuit.tsx, lines 1054-1108.
// Preserves Q2/LED4/R16/R20, their original positions, native symbols and wiring.
// U7.NETLIGHT becomes a boundary net. Other circuitry, PCB placements and section
// frames are omitted. This is the complete four-part indicator, not a full board.
// Corrections change only schematic coordinates/orientation and local wire distance.
export async function createTrackerTransistorLed(
  state: "before" | "existing-only" | "after" = "before",
) {
  const after = state === "after",
    existingOnly = state === "existing-only"
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={after ? 7 : undefined}
    >
      <transistor
        name="Q2"
        type="npn"
        footprint="sot23"
        supplierPartNumbers={{ jlcpcb: ["C20526"] }}
        schX={11}
        schY={-21.5}
        schRotation={after || existingOnly ? -90 : 0}
      />
      <resistor
        name="R20"
        resistance="2.2k"
        footprint="0402"
        schX={after || existingOnly ? 9.1 : 7.5}
        schY={after || existingOnly ? -21.5 : -22.175}
      />
      <led
        name="LED4"
        color="green"
        footprint="0603"
        schRotation={after ? -90 : 90}
        schX={after ? 11.29 : 14}
        schY={after ? -20.1 : -21.5}
      />
      <resistor
        name="R16"
        resistance="330"
        footprint="0402"
        schOrientation={after || existingOnly ? undefined : "vertical"}
        schRotation={after || existingOnly ? 90 : undefined}
        schX={after ? 11.29 : 14}
        schY={after ? -18.7 : -19}
      />
      <trace from="net.U7_NETLIGHT" to="R20.pin1" />
      <trace from="R20.pin2" to="Q2.base" />
      <trace from="Q2.emitter" to="net.GND" />
      <trace from="Q2.collector" to="LED4.cathode" />
      <trace from="LED4.anode" to="R16.pin1" />
      <trace from="R16.pin2" to="net.VSYS" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
