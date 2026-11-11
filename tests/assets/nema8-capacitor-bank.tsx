import React from "react"
import { Circuit } from "@tscircuit/core"
// Real four-capacitor control-sheet extract:
// https://tscircuit.com/ShiboSoftwareDev/nema8-20mm-dual-usbc-stepper-controller?version=1.0.37#schematic
// Release d7f62798-5dff-40bf-842f-54fc1e1b72e5; index.circuit.tsx, C wrapper
// and C_MCU_HF/C_MCU_BULK/C_TEMP/C_STATUS declarations. Positions, rotations,
// values, ratings and suppliers match the source. VIO and GND are boundaries.
// The board has eight capacitors on these nets; these four share the control sheet.
// No published circuit JSON is loaded at runtime.
export async function createNema8CapacitorBank(after = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={after ? 20 : undefined}
    >
      <net name="GND" isGroundNet />
      {!after && (
        <>
          <netlabel
            net="VIO"
            connection="C_MCU_BULK.pin1"
            schX={10}
            schY={3.58}
            anchorSide="left"
          />
          {["C_MCU_HF", "C_MCU_BULK", "C_TEMP", "C_STATUS"].map((name, i) => (
            <netlabel
              net="GND"
              connection={`${name}.pin2`}
              schX={10}
              schY={4.2 - i * 1.5}
              anchorSide="top"
            />
          ))}
        </>
      )}
      {(["C_MCU_HF", "C_MCU_BULK", "C_TEMP", "C_STATUS"] as const).map(
        (name, i) => (
          <capacitor
            key={name}
            name={name}
            capacitance={i === 1 ? "2.2uF" : "100nF"}
            maxVoltageRating={i === 1 ? "10V" : "16V"}
            footprint="0402"
            maxDecouplingTraceLength="50mm"
            supplierPartNumbers={{ jlcpcb: [i === 1 ? "C107370" : "C1525"] }}
            schX={after ? 7.3 + i * 1.8 : 10}
            schY={after ? 2.25 : 4.5 - i * 1.5}
            schRotation={-90}
            connections={{ pin1: "net.VIO", pin2: "net.GND" }}
          />
        ),
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
