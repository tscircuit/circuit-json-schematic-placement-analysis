import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createMultiSheetDifferentLayoutsCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled>
      <schematicsheet name="Power" displayName="Power" sheetIndex={0}>
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
      </schematicsheet>
      <schematicsheet name="Logic" displayName="Logic" sheetIndex={1}>
        <led name="LED_STATUS" footprint="0402" schX={-2} schY={0} />
        <resistor
          name="R_BOOT"
          resistance="10k"
          footprint="0402"
          schX={2.5}
          schY={1.8}
        />
      </schematicsheet>
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export async function createMultiSheetOverlapOnSecondSheetCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled>
      <schematicsheet name="Power" displayName="Power" sheetIndex={0}>
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
      </schematicsheet>
      <schematicsheet name="Logic" displayName="Logic" sheetIndex={1}>
        <led name="LED_STATUS" footprint="0402" schX={-1} schY={0} />
        <resistor
          name="R_BOOT"
          resistance="10k"
          footprint="0402"
          schX={-0.4}
          schY={0.15}
        />
      </schematicsheet>
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
