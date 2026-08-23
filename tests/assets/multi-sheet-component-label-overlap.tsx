import { Circuit } from "@tscircuit/core"
import type { SubcircuitProps } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"

const PIN_LABELS = {
  pin1: "RUN",
  pin2: "IOVDD",
  pin3: "ADC_AVDD",
  pin4: "DVDD",
}

const LabelCollisionBlock = ({
  prefix,
  ...props
}: SubcircuitProps & { prefix: string }) => (
  <subcircuit {...props}>
    <chip name={`${prefix}1`} schX="-2.2" schY="1" pinLabels={PIN_LABELS} />
    <chip name={`${prefix}2`} schX="1.5" schY="1" pinLabels={PIN_LABELS} />
    <chip name={`${prefix}3`} schX="0" schY="-1" pinLabels={PIN_LABELS} />

    <trace
      from={`.${prefix}1 > .DVDD`}
      to={`.${prefix}3 > .RUN`}
      schDisplayLabel="Label"
    />
    <trace
      from={`.${prefix}1 > .ADC_AVDD`}
      to={`.${prefix}3 > .IOVDD`}
      schDisplayLabel="Label"
    />
    <trace
      from={`.${prefix}2 > .RUN`}
      to={`.${prefix}3 > .DVDD`}
      schDisplayLabel="Label"
    />
    <trace
      from={`.${prefix}2 > .IOVDD`}
      to={`.${prefix}3 > .ADC_AVDD`}
      schDisplayLabel="Label"
    />
  </subcircuit>
)

export async function createMultiSheetComponentLabelOverlapCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.add(
    <board>
      <schematicsheet name="Power" displayName="Power" sheetIndex={0} />
      <schematicsheet name="Logic" displayName="Logic" sheetIndex={1} />
      <LabelCollisionBlock
        name="POWER_LABELS"
        prefix="UP"
        schSheetName="Power"
      />
      <LabelCollisionBlock
        name="LOGIC_LABELS"
        prefix="UL"
        schSheetName="Logic"
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
