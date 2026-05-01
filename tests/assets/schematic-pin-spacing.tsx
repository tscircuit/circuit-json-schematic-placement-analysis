import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

async function createSchematicPinSpacingCircuitJson(
  schPinSpacing: number,
): Promise<CircuitJson> {
  const circuit = new Circuit()

  const CHIP_PIN_LABELS = {
    pin1: "RUN",
    pin2: "IOVDD",
    pin3: "ADC_AVDD",
    pin4: "DVDD",
  }

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U4"
        schX={0}
        schY={0}
        schPinSpacing={schPinSpacing}
        schPinArrangement={{
          rightSide: {
            pins: ["pin1", "pin2", "pin3", "pin4"],
            direction: "top-to-bottom",
          },
        }}
        pinLabels={CHIP_PIN_LABELS}
        connections={{
          RUN: "net.RUN",
          IOVDD: "net.IOVDD",
          ADC_AVDD: "net.ADC_AVDD",
          DVDD: "net.DVDD",
        }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export async function createSchematicPinSpacingTooSmallCircuitJson(): Promise<CircuitJson> {
  return createSchematicPinSpacingCircuitJson(0.15)
}

export async function createSchematicPinSpacingTooLargeCircuitJson(): Promise<CircuitJson> {
  return createSchematicPinSpacingCircuitJson(0.5)
}
