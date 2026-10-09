import { Circuit } from "@tscircuit/core"
import type { SubcircuitProps } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"

const PowerVerboseLabelBlock = (props: SubcircuitProps) => (
  <subcircuit {...props}>
    <resistor
      resistance="1k"
      footprint="0402"
      name="RP1"
      schX="-4.4"
      schY="1.7"
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="CP1"
      schX="-2.23"
      schY="2.1"
      connections={{ pin1: "RP1.pin1" }}
    />
    <chip
      footprint="soic8"
      name="UP1"
      schX="-1.58"
      schY="0"
      connections={{ pin1: "CP1.pin2", pin2: "RP1.pin2" }}
    />
    <chip
      footprint="soic8"
      name="UP2"
      schX="-4.86"
      schY="-0.4"
      connections={{ pin1: "UP1.pin3", pin2: "UP1.pin4" }}
    />
  </subcircuit>
)

const LogicVerboseLabelBlock = (props: SubcircuitProps) => (
  <subcircuit {...props}>
    <resistor
      resistance="2k"
      footprint="0402"
      name="RL1"
      schX="-3.9"
      schY="1.4"
    />
    <capacitor
      capacitance="2200pF"
      footprint="0402"
      name="CL1"
      schX="-2.05"
      schY="2"
      schRotation={270}
      connections={{ pin1: "RL1.pin1" }}
    />
    <chip
      footprint="soic8"
      name="UL1"
      schX="-1.22"
      schY="-0.15"
      connections={{ pin1: "CL1.pin2", pin2: "RL1.pin2" }}
    />
    <chip
      footprint="soic8"
      name="UL2"
      schX="-4.45"
      schY="-0.65"
      connections={{ pin1: "UL1.pin3", pin2: "UL1.pin4" }}
    />
  </subcircuit>
)

export async function createMultiSheetVerboseNetLabelCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled schAutoLayoutEnabled>
      <schematicsheet name="Power" displayName="Power" sheetIndex={0} />
      <schematicsheet name="Logic" displayName="Logic" sheetIndex={1} />

      <PowerVerboseLabelBlock name="POWER" schSheetName="Power" />
      <LogicVerboseLabelBlock name="LOGIC" schSheetName="Logic" />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}
