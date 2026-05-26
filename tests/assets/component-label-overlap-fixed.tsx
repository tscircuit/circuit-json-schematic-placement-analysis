import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const CHIP_PIN_LABELS = {
  pin1: "RUN",
  pin2: "IOVDD",
  pin3: "ADC_AVDD",
  pin4: "DVDD",
}

export async function createComponentLabelOverlapFixedCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board schAutoLayoutEnabled>
      <schematicsection name="top" />
      <schematicsection name="bottom" />
      <chip
        name="U1"
        schX="-2.57"
        schY="1"
        pinLabels={CHIP_PIN_LABELS}
        schSectionName="top"
      />
      <chip
        name="U2"
        schX="1.87"
        schY="1"
        pinLabels={CHIP_PIN_LABELS}
        schSectionName="top"
      />
      <chip
        name="U3"
        schX="0"
        schY="-1"
        pinLabels={CHIP_PIN_LABELS}
        schSectionName="bottom"
      />

      <trace from=".U1 > .DVDD" to=".U3 > .RUN" schDisplayLabel="Label" />
      <trace from=".U1 > .ADC_AVDD" to=".U3 > .IOVDD" schDisplayLabel="Label" />

      <trace from=".U2 > .RUN" to=".U3 > .DVDD" schDisplayLabel="Label" />
      <trace from=".U2 > .IOVDD" to=".U3 > .ADC_AVDD" schDisplayLabel="Label" />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
