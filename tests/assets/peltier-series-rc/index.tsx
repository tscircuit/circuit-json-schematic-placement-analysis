import { Circuit } from "@tscircuit/core"
import { A_0603WAF1001T5E as Resistor0603 } from "./imports/A_0603WAF1001T5E"
import { CC0603KRX7R9BB472 } from "./imports/CC0603KRX7R9BB472"
import { CC0603JRNPO0BN101 } from "./imports/CC0603JRNPO0BN101"

// Complete three-part branch from 0hmX/dual-usb-peltier-assembly v0.4.3,
// src/board/power-stage.tsx and its original component imports.
// https://tscircuit.com/0hmX/dual-usb-peltier-assembly?version=0.4.3#schematic
// Release 6991f07d-2100-420b-9047-46d7c87b3acf. Freeze published auto-layout
// positions; the later v0.4.8 source already groups these parts correctly.
export const peltierRcPlacements = {
  R_COMP: [5.255, -0.78, 0],
  C_COMP_ZERO: [4.595, 3.18, -90],
  C_COMP_POLE: [6.015, 1.14, -90],
} as const
export type PeltierRcLayout = Partial<
  Record<keyof typeof peltierRcPlacements, readonly [number, number, number]>
>

export async function createPeltierSeriesRc(
  placements: PeltierRcLayout = {},
  boundaryLabelX = 3,
) {
  const at = (name: keyof typeof peltierRcPlacements) => {
    const [schX, schY, schRotation] =
      placements[name] ?? peltierRcPlacements[name]
    return { name, schX, schY, schRotation }
  }
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schMaxTraceDistance={100} schTraceAutoLabelEnabled={false}>
      <net name="GND" isGroundNet />
      <Resistor0603
        {...at("R_COMP")}
        resistance="27.4k"
        manufacturerPartNumber="0603WAF2742T5E"
        supplierPartNumbers={{ jlcpcb: ["C22964"] }}
        pcbX={1}
        pcbY={9}
        connections={{ pin1: "net.DRIVER_COMP" }}
      />
      <CC0603KRX7R9BB472
        {...at("C_COMP_ZERO")}
        maxVoltageRating="50V"
        pcbX={1}
        pcbY={6}
        connections={{ pin2: "net.GND" }}
      />
      <CC0603JRNPO0BN101
        {...at("C_COMP_POLE")}
        maxVoltageRating="100V"
        pcbX={1}
        pcbY={3}
        connections={{ pin1: "net.DRIVER_COMP", pin2: "net.GND" }}
      />
      {/* Original private DRIVER_COMP_ZERO node, drawn as a wire in this extract. */}
      <trace from=".R_COMP > .pin2" to=".C_COMP_ZERO > .pin1" />
      <netlabel
        net="DRIVER_COMP"
        connectsTo=".C_COMP_POLE > .pin1"
        schX={boundaryLabelX}
        schY={1.8}
        anchorSide="right"
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
