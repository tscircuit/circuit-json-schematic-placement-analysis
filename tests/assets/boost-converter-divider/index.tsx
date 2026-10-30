import { Circuit } from "@tscircuit/core"
import { MT3608 } from "./MT3608"
// Published imrishabh18/boost-converter 1.0.2 (release 3c938c18-451d-4aea-8ecc-b5e5f561e6c6).
// https://tscircuit.com/imrishabh18/boost-converter#schematic
// Complete U1/R1/R2 extract. Positions, values, symbols and chip pins come from the source.
// "before" only applies existing resistor-rotation advice; external nets terminate at labels.
export async function createBoostConverterDivider(mode: "original" | "before") {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(
    <board schMaxTraceDistance={30} schTraceAutoLabelEnabled={false}>
      <MT3608
        name="U1"
        manufacturerPartNumber="MT3608"
        schX={0}
        schY={0}
        pinLabels={{
          pin1: "SW",
          pin2: "GND",
          pin3: "FB",
          pin4: "EN",
          pin5: "IN",
          pin6: "NC",
        }}
        schPinArrangement={{
          leftSide: { direction: "top-to-bottom", pins: ["SW", "GND", "FB"] },
          rightSide: { direction: "bottom-to-top", pins: ["EN", "IN", "NC"] },
        }}
        connections={{ SW: "net.SW", FB: "net.FB", EN: "net.V5", IN: "net.V5" }}
      />
      <resistor
        name="R1"
        resistance="62k"
        manufacturerPartNumber="0603WAF6202T5E"
        supplierPartNumbers={{ jlcpcb: ["C23221"] }}
        footprint="0603"
        schX={4.8}
        schY={0.4}
        schRotation={mode === "original" ? 0 : 270}
        connections={{ pin1: "net.VOUT_12V", pin2: "net.FB" }}
      />
      <resistor
        name="R2"
        resistance="3.3k"
        manufacturerPartNumber="0603WAF3301T5E"
        supplierPartNumbers={{ jlcpcb: ["C22978"] }}
        footprint="0603"
        schX={4.8}
        schY={-1.4}
        schRotation={mode === "original" ? 0 : 270}
        connections={{ pin1: "net.FB" }}
      />
      <trace from="U1.GND" to="net.GND" schDisplayLabel="GND" />
      <trace from="R2.pin2" to="net.GND" schDisplayLabel="GND" />
      <netlabel
        net="GND"
        connectsTo=".U1 > .GND"
        schX={-1.25}
        schY={0}
        anchorSide="right"
      />
      <netlabel
        net="GND"
        connectsTo=".R2 > .pin2"
        schX={4.8}
        schY={-2.1}
        anchorSide="top"
      />
      <net name="VOUT_12V" isPowerNet />
      <net name="V5" isPowerNet />
      <net name="GND" isGroundNet />
    </board>,
  )
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
