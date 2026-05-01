import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const CHIP_PIN_LABELS = {
  pin1: "RUN",
  pin2: "IOVDD",
  pin3: "ADC_AVDD",
  pin4: "DVDD",
}

interface SchematicPinPaddingToEdgeHorizontalOptions {
  schWidth?: number
  schHeight?: number
}

const mm = (value: number): string => `${value}mm`

export async function createSchematicPinPaddingToEdgeHorizontalCircuitJson(
  options: SchematicPinPaddingToEdgeHorizontalOptions = {},
): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U4"
        footprint="soic8"
        schX={0}
        schY={0}
        schWidth={mm(options.schWidth ?? 3)}
        schHeight={mm(options.schHeight ?? 1)}
        schPinArrangement={{
          topSide: {
            pins: ["pin1", "pin2", "pin3", "pin4"],
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
