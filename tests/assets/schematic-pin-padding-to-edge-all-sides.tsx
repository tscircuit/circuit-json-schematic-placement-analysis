import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const CHIP_PIN_LABELS = {
  pin1: "L",
  pin2: "LL",
  pin3: "RRR",
  pin4: "RRRR",
  pin5: "TTTTT",
  pin6: "TT",
  pin7: "BBBBBB",
  pin8: "B",
}

interface SchematicPinPaddingToEdgeAllSidesOptions {
  schWidth?: number
  schHeight?: number
}

const mm = (value: number): string => `${value}mm`

export async function createSchematicPinPaddingToEdgeAllSidesCircuitJson(
  options: SchematicPinPaddingToEdgeAllSidesOptions = {},
): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U5"
        footprint="soic8"
        schX={0}
        schY={0}
        schWidth={mm(options.schWidth ?? 3)}
        schHeight={mm(options.schHeight ?? 3)}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin2"],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: ["pin3", "pin4"],
            direction: "top-to-bottom",
          },
          topSide: {
            pins: ["pin5", "pin6"],
            direction: "left-to-right",
          },
          bottomSide: {
            pins: ["pin7", "pin8"],
            direction: "left-to-right",
          },
        }}
        pinLabels={CHIP_PIN_LABELS}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
