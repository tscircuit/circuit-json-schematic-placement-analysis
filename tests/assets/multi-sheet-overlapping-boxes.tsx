import { Circuit } from "@tscircuit/core"
import type { SubcircuitProps } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"

const PowerBlock = (props: SubcircuitProps) => (
  <subcircuit {...props}>
    <capacitor
      name="C_BULK"
      capacitance="10uF"
      footprint="0402"
      schX={-3}
      schY={0}
      schOrientation="vertical"
    />
    <resistor
      name="R_SENSE"
      resistance="0.1"
      footprint="0402"
      schX={2.5}
      schY={0}
    />
  </subcircuit>
)

const LogicNoOverlapBlock = (props: SubcircuitProps) => (
  <subcircuit {...props}>
    <led name="LED_STATUS" footprint="0402" schX={-2} schY={0} />
    <resistor
      name="R_BOOT"
      resistance="10k"
      footprint="0402"
      schX={2.5}
      schY={1.8}
    />
  </subcircuit>
)

const LogicOverlapBlock = (props: SubcircuitProps) => (
  <subcircuit {...props}>
    <led name="LED_STATUS" footprint="0402" schX={-1} schY={0} />
    <resistor
      name="R_BOOT"
      resistance="10k"
      footprint="0402"
      schX={-0.4}
      schY={0.15}
    />
  </subcircuit>
)

export async function createMultiSheetDifferentLayoutsCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled>
      <schematicsheet name="Power" displayName="Power" sheetIndex={0} />
      <schematicsheet name="Logic" displayName="Logic" sheetIndex={1} />

      <PowerBlock name="POWER" schSheetName="Power" />
      <LogicNoOverlapBlock name="LOGIC" schSheetName="Logic" />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export async function createMultiSheetOverlapOnSecondSheetCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled>
      <schematicsheet name="Power" displayName="Power" sheetIndex={0} />
      <schematicsheet name="Logic" displayName="Logic" sheetIndex={1} />

      <PowerBlock name="POWER" schSheetName="Power" />
      <LogicOverlapBlock name="LOGIC" schSheetName="Logic" />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
