import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createTextClearanceSheets(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <schematicsheet name="First" displayName="First" />
      <schematicsheet name="Second" displayName="Second" />
      <group name="FirstBlock" schSheetName="First">
        <schematictext text="FIRST HEADING" schX={0} schY={0} fontSize={0.6} />
        <schematictext
          text="OVERLAPPING NOTE"
          schX={0}
          schY={0}
          fontSize={0.6}
        />
      </group>
      <group name="SecondBlock" schSheetName="Second">
        <schematictext text="OTHER SHEET" schX={0} schY={0} fontSize={0.6} />
      </group>
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
