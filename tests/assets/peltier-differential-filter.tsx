// Published source: https://tscircuit.com/rushabhcodes/simple-usb-c-pd-peltier-driver?version=0.1.6#schematic
// POWER sheet; src/board/power-stage.tsx. Four-component filter extract.
// PCB geometry and other blocks are omitted. Published schematic geometry, symbols,
// component values, chip pin arrangement and connections within this network are retained.
import { Circuit } from "@tscircuit/core"
import { A_0603WAF1001T5E as Resistor } from "./peltier-filter/A_0603WAF1001T5E"
import { CC0603KRX7R9BB224 as Capacitor } from "./peltier-filter/CC0603KRX7R9BB224"
import { TPS55289RYQR } from "./peltier-filter/TPS55289RYQR"
export default function PeltierDifferentialFilter() {
  return (
    <board
      routingDisabled
      schTraceAutoLabelEnabled={false}
      schMaxTraceDistance={40}
    >
      <net name="GND" isGroundNet />
      <net name="TEC_POS" isPowerNet />
      <TPS55289RYQR
        name="U_DRIVER"
        schX={0}
        schY={0}
        schWidth={4.6}
        connections={{
          pin12: "net.DRIVER_ISP",
          pin13: "net.DRIVER_ISN",
          pin9: "net.GND",
          pin17: "net.GND",
          pin21: "net.GND",
          pin2: "net.GND",
          pin5: "net.GND",
        }}
      />
      <Resistor
        name="R_ISP_FILTER"
        resistance="10"
        manufacturerPartNumber="0603WAF100JT5E"
        supplierPartNumbers={{ jlcpcb: ["C22859"] }}
        schX={6.75}
        schY={-0.9}
        schRotation={180}
        connections={{ pin1: "net.DRIVER_OUT", pin2: "net.DRIVER_ISP" }}
      />
      <Resistor
        name="R_ISN_FILTER"
        resistance="10"
        manufacturerPartNumber="0603WAF100JT5E"
        supplierPartNumbers={{ jlcpcb: ["C22859"] }}
        schX={7.25}
        schY={-2.1}
        schRotation={270}
        connections={{ pin1: "net.TEC_POS", pin2: "net.DRIVER_ISN" }}
      />
      <Capacitor
        name="C_CURRENT_FILTER"
        maxVoltageRating="50V"
        schX={4.5}
        schY={-1.5}
        schRotation={270}
        connections={{
          pin1: "net.DRIVER_ISP",
          pin2: "net.DRIVER_ISN",
        }}
      />
    </board>
  )
}
export async function createPeltierDifferentialFilter() {
  const c = new Circuit()
  c.pcbDisabled = true
  c.add(<PeltierDifferentialFilter />)
  await c.renderUntilSettled()
  return c.getCircuitJson()
}
