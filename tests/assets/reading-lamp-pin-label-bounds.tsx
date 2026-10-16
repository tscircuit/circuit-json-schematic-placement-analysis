import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

/** U10/U11 from muse/book-reading-clip-lamp: twelve rows at 0.2-unit
 * pitch span the entire 2.2-unit body, leaving the end labels on its border.
 * Isolate one chip because the failure does not depend on its connections. */
export async function createReadingLampPinLabelBoundsCircuitJson(
  height = 2.2,
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board routingDisabled>
      <chip
        name="U10"
        manufacturerPartNumber="SN74AXC8T245PWR"
        schWidth={2}
        schHeight={height}
        schPinSpacing={0.2}
        pinLabels={{
          pin1: "VCCA",
          pin2: "DIR1",
          pin3: "A1",
          pin4: "A2",
          pin5: "A3",
          pin6: "A4",
          pin7: "A5",
          pin8: "A6",
          pin9: "A7",
          pin10: "A8",
          pin11: "DIR2",
          pin12: "GND1",
          pin13: "GND2",
          pin14: "B8",
          pin15: "B7",
          pin16: "B6",
          pin17: "B5",
          pin18: "B4",
          pin19: "B3",
          pin20: "B2",
          pin21: "B1",
          pin22: "N_OE",
          pin23: "VCCB1",
          pin24: "VCCB2",
        }}
        schPinArrangement={{
          leftSide: {
            pins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13],
            direction: "top-to-bottom",
          },
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
