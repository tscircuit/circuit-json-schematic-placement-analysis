import { Circuit } from "@tscircuit/core"
import type {
  AnySourceComponent,
  CircuitJson,
  SchematicComponent,
  SchematicPort,
  SchematicTrace,
} from "circuit-json"

export async function createTraceSimplificationCircuitJson({
  addBlockingComponent = false,
}: {
  addBlockingComponent?: boolean
} = {}): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U3"
        footprint="soic8"
        schX={0}
        schY={0}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <resistor
        name="R11"
        resistance="100k"
        footprint="0603"
        schX={4}
        schY={2}
        schRotation={90}
      />
      {addBlockingComponent && (
        <resistor
          name="R12"
          resistance="1k"
          footprint="0603"
          schX={5}
          schY={2}
          schRotation={90}
        />
      )}
      <trace from=".U3 > .pin1" to=".R11 > .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const chipPort = getPort(circuitJson, "U3")
  const resistorPort = getPort(circuitJson, "R11", 1)
  if (
    chipPort.facing_direction !== "right" ||
    (resistorPort.facing_direction !== "up" &&
      resistorPort.facing_direction !== "down")
  ) {
    throw new Error(
      "expected a right-facing chip port and vertical resistor port",
    )
  }

  const bendX = resistorPort.center.x + 1
  const replacementTrace: SchematicTrace = {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_r11",
    source_trace_id: "source_trace_r11",
    junctions: [],
    edges: [
      {
        from: chipPort.center,
        to: { x: bendX, y: chipPort.center.y },
        from_schematic_port_id: chipPort.schematic_port_id,
      },
      {
        from: { x: bendX, y: chipPort.center.y },
        to: { x: bendX, y: resistorPort.center.y },
      },
      {
        from: { x: bendX, y: resistorPort.center.y },
        to: resistorPort.center,
        to_schematic_port_id: resistorPort.schematic_port_id,
      },
    ],
  }

  return [
    ...circuitJson.filter((element) => element.type !== "schematic_trace"),
    replacementTrace,
  ]
}

function getPort(
  circuitJson: CircuitJson,
  componentName: string,
  pinNumber?: number,
): SchematicPort {
  const sourceComponent = circuitJson.find(
    (element): element is AnySourceComponent =>
      element.type === "source_component" && element.name === componentName,
  )
  const schematicComponent = circuitJson.find(
    (element): element is SchematicComponent =>
      element.type === "schematic_component" &&
      element.source_component_id ===
        (sourceComponent && "source_component_id" in sourceComponent
          ? sourceComponent.source_component_id
          : undefined),
  )
  const port = circuitJson.find(
    (element): element is SchematicPort =>
      element.type === "schematic_port" &&
      element.schematic_component_id ===
        schematicComponent?.schematic_component_id &&
      (pinNumber === undefined || element.pin_number === pinNumber),
  )
  if (!port) throw new Error(`expected schematic port for ${componentName}`)
  return port
}
