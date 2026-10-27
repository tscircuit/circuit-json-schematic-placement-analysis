import React from "react"
import { Circuit } from "@tscircuit/core"
import { A_0402WGF4701TCE } from "./A_0402WGF4701TCE"

// Real boot-pad extract: https://tscircuit.com/AnasSarkiz/NEMA14_CH32X035G8U6?version=1.12.2#schematic
// Parts/footprints/connections: src/board.tsx and imports/supplier/A_0402WGF4701TCE.
// The source TSX stores PCB placement; schematic centers/rotations below are frozen
// from that version's dist/index/circuit.json. No published JSON is used at runtime.
// Current core draws these native symbols 20% smaller than the published export;
// their types, centers, orientations, values and pin connections are unchanged.
// V3V3 is the boundary rail. Other board blocks are omitted.
export async function createNema14ResistorTestPoint() {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "relative" }} schMaxTraceDistance={10}>
      <net name="V3V3" isPowerNet />
      <A_0402WGF4701TCE
        name="R_USB_BOOT"
        schX={23}
        schY={15}
        schRotation={-90}
      />
      <testpoint
        name="TP_BOOT"
        footprintVariant="pad"
        padDiameter="1.1mm"
        schX={27}
        schY={12.5}
        schRotation={0}
        footprint={
          <footprint>
            <smtpad portHints={["pin1"]} shape="circle" radius={0.55} />
            <courtyardoutline
              outline={[
                { x: -0.7, y: -0.7 },
                { x: 0.7, y: -0.7 },
                { x: 0.7, y: 0.7 },
                { x: -0.7, y: 0.7 },
                { x: -0.7, y: -0.7 },
              ]}
            />
          </footprint>
        }
      />
      <trace from="R_USB_BOOT.pin1" to="net.V3V3" />
      <trace from="R_USB_BOOT.pin2" to="net.BOOT_PAD" />
      <trace from="TP_BOOT.pin1" to="net.BOOT_PAD" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
