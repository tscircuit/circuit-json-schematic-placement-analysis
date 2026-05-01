import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const CHIP_PIN_LABELS = {
  pin1: "RUN",
  pin2: "IOVDD",
  pin3: "ADC_AVDD",
  pin4: "DVDD",
}

interface SchematicPinPaddingToEdgeOptions {
  schWidth?: number
  schHeight?: number
}

const mm = (value: number): string => `${value}mm`

export async function createSchematicPinPaddingToEdgeCircuitJson(
  options: SchematicPinPaddingToEdgeOptions = {},
): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U3"
        footprint="soic8"
        schX={0}
        schY={0}
        schWidth={mm(options.schWidth ?? 1)}
        schHeight={mm(options.schHeight ?? 3)}
        schPinArrangement={{
          rightSide: {
            pins: ["pin1", "pin2", "pin3", "pin4"],
            direction: "top-to-bottom",
          },
        }}
        pinLabels={CHIP_PIN_LABELS}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
