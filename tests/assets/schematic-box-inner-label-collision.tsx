import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const CHIP_PIN_LABELS = {
  pin1: "RUN",
  pin2: "IOVDD",
  pin3: "ADC_AVDD",
  pin4: "DVDD",
  pin5: "VDD",
  pin6: "VDV",
  pin7: "TOP_AVDD",
  pin8: "BOTTOM_DVDD",
}

interface SchematicBoxInnerLabelCollisionOptions {
  schWidth?: number
  schHeight?: number
}

const mm = (value: number): string => `${value}mm`

export async function createSchematicBoxInnerLabelCollisionCircuitJson(
  options: SchematicBoxInnerLabelCollisionOptions = {},
): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U2"
        footprint="soic8"
        schX={0}
        schY={0}
        schHeight={mm(options.schHeight ?? 2)}
        schWidth={mm(options.schWidth ?? 3)}
        schPinArrangement={{
          rightSide: {
            pins: ["pin1", "pin2", "pin3", "pin4"],
            direction: "top-to-bottom",
          },
          leftSide: {
            pins: ["pin5", "pin6"],
            direction: "top-to-bottom",
          },
          topSide: {
            pins: ["pin7"],
            direction: "left-to-right",
          },
          bottomSide: {
            pins: ["pin8"],
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
