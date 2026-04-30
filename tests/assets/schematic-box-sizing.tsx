import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const ONE_SIDED_PIN_LABELS = {
  pin1: "D_PLUS",
  pin2: "D_MINUS",
  pin3: "D0",
  pin4: "GND",
  pin5: "D1",
  pin6: "D2",
  pin7: "D3",
  pin8: "D4",
  pin9: "D5",
  pin10: "D6",
  pin11: "D7",
  pin12: "D8",
  pin13: "D9",
}

const ONE_SIDED_PINS = Object.keys(ONE_SIDED_PIN_LABELS)

export async function createSchematicBoxSizingCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <pinheader
        name="JP2"
        pinCount={13}
        schX={0}
        schY={3}
        schPinArrangement={{
          rightSide: {
            pins: ONE_SIDED_PINS,
            direction: "top-to-bottom",
          },
        }}
        pinLabels={ONE_SIDED_PIN_LABELS}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
