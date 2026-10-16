import { Circuit } from "@tscircuit/core"
import type { ReactNode } from "react"
import { PJ_320D } from "./imports/PJ_320D"
import { RVT0J221M0605_220UF_6_3V } from "./imports/RVT0J221M0605_220UF_6_3V"

// Complete 11-part Audio/headphone section from mohan-bee/mini-mp3-player v1.2.0.
// https://tscircuit.com/mohan-bee/mini-mp3-player?version=1.2.0#schematic
// Release: 69ee72ea-36c9-4629-a498-d83692d97817.
// Connections/values: index.circuit.tsx, design.ts, parts.ts and the original imports.
// Freeze the published auto-layout positions, translated by (+2.2728214, +48.0425).
// Decoder/other sections and PCB/CAD rendering are outside this schematic repro.
export const headphonePlacements = {
  J4: [0, 0.1, 0],
  C43: [-3.7, 0, 0],
  C44: [3.7, 0, 0],
  R18: [0, -3.74, 0],
  R19: [-7.1, 0, 0],
  R20: [7.1, 0, 0],
  R25: [-1.8, 3.9, -90],
  R26: [1.68, 3.9, -90],
  C33: [-3.52, -3.7, -90],
  C34: [-7.22, -3.44, -90],
  C35: [5.24, 3.65, -90],
} as const

export type HeadphonePartName = keyof typeof headphonePlacements
export type HeadphoneLayout = Partial<
  Record<HeadphonePartName, readonly [number, number, number]>
>
type Props = {
  placements?: HeadphoneLayout
  children?: ReactNode
  schMaxTraceDistance?: number
}
export default function MiniMp3Headphones({
  placements = {},
  children,
  schMaxTraceDistance,
}: Props) {
  const at = (name: HeadphonePartName) => {
    const [schX, schY, schRotation] =
      placements[name] ?? headphonePlacements[name]
    return { name, schX, schY, schRotation }
  }
  return (
    <board
      schAutoLayoutEnabled={false}
      schMaxTraceDistance={schMaxTraceDistance}
    >
      <net name="GND" isGroundNet />
      <PJ_320D
        {...at("J4")}
        connections={{
          pin1: "net.GND",
          pin2: "net.HP_L",
          pin3: "net.HP_R",
          pin4: "net.GND",
        }}
      />
      <RVT0J221M0605_220UF_6_3V
        {...at("C43")}
        connections={{ pin1: "net.LEFT", pin2: "net.HP_L" }}
      />
      <RVT0J221M0605_220UF_6_3V
        {...at("C44")}
        connections={{ pin1: "net.RIGHT", pin2: "net.HP_R" }}
      />
      <resistor
        {...at("R18")}
        resistance="20"
        supplierPartNumbers={{ jlcpcb: ["C22950"] }}
        footprint="0603"
        connections={{ pin1: "net.GBUF", pin2: "net.GBUF_Z" }}
      />
      <resistor
        {...at("R19")}
        resistance="20"
        supplierPartNumbers={{ jlcpcb: ["C22950"] }}
        footprint="0603"
        connections={{ pin1: "net.LEFT", pin2: "net.LEFT_Z" }}
      />
      <resistor
        {...at("R20")}
        resistance="20"
        supplierPartNumbers={{ jlcpcb: ["C22950"] }}
        footprint="0603"
        connections={{ pin1: "net.RIGHT", pin2: "net.RIGHT_Z" }}
      />
      <resistor
        {...at("R25")}
        resistance="100k"
        supplierPartNumbers={{ jlcpcb: ["C25803"] }}
        footprint="0603"
        connections={{ pin1: "net.HP_L", pin2: "net.GND" }}
      />
      <resistor
        {...at("R26")}
        resistance="100k"
        supplierPartNumbers={{ jlcpcb: ["C25803"] }}
        footprint="0603"
        connections={{ pin1: "net.HP_R", pin2: "net.GND" }}
      />
      <capacitor
        {...at("C33")}
        capacitance="10nF"
        supplierPartNumbers={{ jlcpcb: ["C57112"] }}
        footprint="0603"
        connections={{ pin1: "net.GBUF_Z", pin2: "net.GND" }}
      />
      <capacitor
        {...at("C34")}
        capacitance="10nF"
        supplierPartNumbers={{ jlcpcb: ["C57112"] }}
        footprint="0603"
        connections={{ pin1: "net.LEFT_Z", pin2: "net.GND" }}
      />
      <capacitor
        {...at("C35")}
        capacitance="10nF"
        supplierPartNumbers={{ jlcpcb: ["C57112"] }}
        footprint="0603"
        connections={{ pin1: "net.RIGHT_Z", pin2: "net.GND" }}
      />
      {children}
    </board>
  )
}
export async function createMiniMp3Headphones(props: Props = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<MiniMp3Headphones {...props} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
