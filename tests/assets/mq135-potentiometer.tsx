import React from "react"
import { Circuit } from "@tscircuit/core"

// Real-board control extract:
// https://tscircuit.com/0hmX/mq135-air-quality-sensor-module?version=1.0.1#schematic
// Release 66d2bf71-ab41-48bb-b9fc-a09565fec0ee, index.circuit.tsx.
// Source SHA256 a314d02d4685c934695b68c5d2490a1d281e96ceeb22cbb7d7e1d487aa1f9d09.
// RV1's position, symbol, value, display name and all three pin connections are
// retained. THRESHOLD continues to U1.INB_POS outside this one-control extract.
// PCB placement, CAD model and other board sections are omitted.
export async function createMq135Potentiometer(after = false) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "relative" }}>
      <potentiometer
        name="RV1"
        displayName="103"
        maxResistance="10kohm"
        pinVariant="three_pin"
        supplierPartNumbers={{ jlcpcb: ["C118956"] }}
        manufacturerPartNumber="3362P-1-103"
        schX={0}
        schY={5}
        schRotation={after ? -90 : 0}
        footprint={
          <footprint>
            <platedhole
              portHints={["pin1"]}
              pcbX={-2.5}
              pcbY={-1.25}
              shape="circle"
              holeDiameter="1mm"
              outerDiameter="1.8mm"
            />
            <platedhole
              portHints={["pin2"]}
              pcbX={0}
              pcbY={1.25}
              shape="circle"
              holeDiameter="1mm"
              outerDiameter="1.8mm"
            />
            <platedhole
              portHints={["pin3"]}
              pcbX={2.5}
              pcbY={-1.25}
              shape="circle"
              holeDiameter="1mm"
              outerDiameter="1.8mm"
            />
          </footprint>
        }
      />
      <trace from="RV1.pin1" to="net.VCC_5V" />
      <trace from="RV1.pin2" to="net.THRESHOLD" />
      <trace from="RV1.pin3" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
