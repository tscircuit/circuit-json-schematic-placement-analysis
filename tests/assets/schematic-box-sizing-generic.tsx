import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createSchematicBoxSizingGenericCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board>
      <connector
        name="U3"
        standard="usb_c"
        footprint="pinrow8"
        schX={8.1}
        schY={8.4}
        schWidth={4.4}
        schHeight={2.0}
        pinLabels={{
          pin1: "VBUS",
          pin2: "D_PLUS",
          pin3: "D_MINUS",
          pin4: "CC1",
          pin5: "CC2",
          pin6: "SBU1",
          pin7: "SBU2",
          pin8: "GND",
        }}
        schPinArrangement={{
          rightSide: [
            "pin1",
            "pin2",
            "pin3",
            "pin4",
            "pin5",
            "pin6",
            "pin7",
            "pin8",
          ],
        }}
        connections={{
          VBUS: "net.VBUS",
          D_PLUS: "net.D_PLUS",
          D_MINUS: "net.D_MINUS",
          CC1: "net.CC1",
          CC2: "net.CC2",
          GND: "net.GND",
        }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
