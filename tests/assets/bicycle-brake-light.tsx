import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"
import { XL_1608SURC_06 } from "./bicycle-brake-light/XL_1608SURC_06"

// Complete Lights sheet: https://tscircuit.com/Devesh36/bicycle-brake-light?version=0.1.3
// Freeze the published grid placements; preserve the imported LED and Q1 pinout.
export type BicycleLightPlacements = Record<
  string,
  { schX: number; schY: number; schRotation?: number }
>

interface Options {
  placements?: BicycleLightPlacements
  schMaxTraceDistance?: number
}

export function BicycleBrakeLights({
  placements = {},
  schMaxTraceDistance,
}: Options = {}) {
  return (
    <board
      schLayout={{ layoutMode: "relative" }}
      schMaxTraceDistance={schMaxTraceDistance}
    >
      <schematicsheet
        name="Lights"
        displayName="Six red LEDs and PWM switch"
        sheetIndex={3}
        sheetSize="ANSI_B"
      >
        {/* Boundary supply metadata comes from U2 pin 5 and Q1 pin 2 in the original TSX. */}
        <net name="V3V3" isPowerNet />
        <net name="GND" isGroundNet />
        <group>
          {Array.from({ length: 6 }, (_, i) => {
            const schX = -7.05 + (i % 2) * 9.4
            const schY = 5.475 - Math.floor(i / 2) * 3.65
            return (
              <Fragment key={i}>
                <resistor
                  name={`R${12 + i}`}
                  resistance="120"
                  footprint="0603"
                  schX={schX}
                  schY={schY}
                  {...placements[`R${12 + i}`]}
                  connections={{ pin1: "net.V3V3", pin2: `net.LED${i + 1}_A` }}
                />
                <XL_1608SURC_06
                  name={`D${i + 1}`}
                  color="red"
                  cadModel={undefined}
                  schX={schX + 4.7}
                  schY={schY}
                  {...placements[`D${i + 1}`]}
                  connections={{
                    anode: `net.LED${i + 1}_A`,
                    cathode: "net.LED_RETURN",
                  }}
                />
              </Fragment>
            )
          })}
          <chip
            name="Q1"
            manufacturerPartNumber="AO3400A"
            footprint="sot23"
            schX={-7.05}
            schY={-5.475}
            {...placements.Q1}
            pinAttributes={{
              pin1: { isInput: true },
              pin2: { requiresGround: true },
              pin3: { isPassive: true },
            }}
            pinLabels={{ pin1: "GATE", pin2: "SOURCE", pin3: "DRAIN" }}
            connections={{
              pin1: "net.GATE",
              pin2: "net.GND",
              pin3: "net.LED_RETURN",
            }}
          />
          <resistor
            name="R18"
            resistance="100"
            footprint="0603"
            schX={-2.35}
            schY={-5.475}
            {...placements.R18}
            connections={{ pin1: "net.LED_PWM", pin2: "net.GATE" }}
          />
          <resistor
            name="R19"
            resistance="100k"
            footprint="0603"
            schX={2.35}
            schY={-5.475}
            {...placements.R19}
            connections={{ pin1: "net.GATE", pin2: "net.GND" }}
          />
        </group>
      </schematicsheet>
    </board>
  )
}

export async function createBicycleBrakeLights(options: Options = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(<BicycleBrakeLights {...options} />)
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
