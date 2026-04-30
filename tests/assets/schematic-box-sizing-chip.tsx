import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const CHIP_PIN_LABELS = {
  pin1: "RUN",
  pin2: "IOVDD",
  pin3: "ADC_AVDD",
  pin4: "DVDD",
}

export async function createSchematicBoxSizingChipCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U2"
        footprint="soic8"
        schX={0}
        schY={0}
        schWidth="3mm"
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
