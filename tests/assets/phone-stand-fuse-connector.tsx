import React from "react"
import { Circuit } from "@tscircuit/core"

// Real-board Qi power-output extract:
// https://tscircuit.com/Devesh36/usb-c-phone-stand-light?version=0.0.6#schematic
// Release 2157281c-4ab5-4efc-a338-d469670a7d8e; lighting-board.tsx, lines 3-23.
// Preserves F_QI/J_QI positions, native symbols, values, footprint and pin order.
// J_USB.pin1 becomes a boundary net. Other circuitry and PCB placements are
// omitted. This is a two-part connection, not a complete power board.
// Corrections change only schematic coordinates/facing and local wire distance.
export async function createPhoneStandFuseConnector(after = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={after ? 7 : undefined}
    >
      <pinheader
        name="J_QI"
        schFacingDirection={after ? "left" : undefined}
        pinCount={2}
        pinLabels={{ pin1: "5V_QI", pin2: "GND" }}
        schX={-1}
        schY={4}
        manufacturerPartNumber="Solder wire pads, 5.08mm"
        footprint={
          <footprint>
            {[1, 2].map((n, i) => (
              <React.Fragment key={n}>
                <platedhole
                  portHints={[`pin${n}`]}
                  pcbY={(0.5 - i) * 5.08}
                  shape="circle"
                  holeDiameter={1.2}
                  outerDiameter={2.4}
                />
              </React.Fragment>
            ))}
          </footprint>
        }
        cadModel={null}
      />
      <fuse
        name="F_QI"
        footprint="1812"
        currentRating="2A"
        voltageRating={6}
        manufacturerPartNumber="MF-MSMF200-2"
        schX={after ? -4 : -5}
        schY={after ? 4.06 : 4}
      />
      <net name="GND" isGroundNet connectsTo={["J_QI.pin2"]} />
      <trace from="net.J_USB_PIN1" to="F_QI.pin1" />
      <trace from="F_QI.pin2" to="J_QI.pin1" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
