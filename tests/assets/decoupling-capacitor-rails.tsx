import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { Fragment } from "react"

interface CapacitorPlacement {
  name: string
  schX: number
  schY?: number
  rail?: string | null
  ground?: string | null
  schSheetName?: string
}

const renderCapacitor = ({
  rail = "VCC",
  ground = "GND",
  ...placement
}: CapacitorPlacement) => (
  <capacitor
    key={placement.name}
    {...placement}
    capacitance="100nF"
    footprint="0402"
    schOrientation="vertical"
    connections={{
      ...(rail ? { pin1: `net.${rail}` } : {}),
      ...(ground ? { pin2: `net.${ground}` } : {}),
    }}
  />
)

export async function createDecouplingCapacitorRailsCircuitJson(
  capacitors: CapacitorPlacement[],
): Promise<CircuitJson> {
  const circuit = new Circuit()
  const sheets = [
    ...new Set(
      capacitors.flatMap((cap) => (cap.schSheetName ? [cap.schSheetName] : [])),
    ),
  ]
  circuit.add(
    <board width="40mm" height="40mm" routingDisabled>
      {sheets.map((name, sheetIndex) => (
        <Fragment key={name}>
          <schematicsheet
            name={name}
            displayName={name}
            sheetIndex={sheetIndex}
          />
        </Fragment>
      ))}
      {capacitors.map(renderCapacitor)}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
