import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createSingleSheetOverlapCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.add(
    <board>
      <schematicsheet name="Main" displayName="Main" sheetIndex={0} />
      <subcircuit name="MAIN" schSheetName="Main">
        <resistor
          name="R1"
          resistance="1k"
          footprint="0402"
          schX={0}
          schY={0}
        />
        <resistor
          name="R2"
          resistance="2k"
          footprint="0402"
          schX={0}
          schY={0}
        />
      </subcircuit>
    </board>,
  )

  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
