import { Circuit } from "@tscircuit/core"
import type { CircuitJson, SchematicPort, SchematicTrace } from "circuit-json"

export async function createTwoPinComponentOrientationCircuitJson({
  facesConnectedComponent,
}: {
  facesConnectedComponent: boolean
}): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U1"
        footprint="soic8"
        schX={0}
        schY={-3}
        schPinArrangement={{
          topSide: { pins: ["pin1"], direction: "left-to-right" },
          leftSide: { pins: ["pin2"], direction: "top-to-bottom" },
          rightSide: { pins: ["pin3"], direction: "top-to-bottom" },
        }}
      />
      <capacitor
        name="C1"
        capacitance="1uF"
        footprint="0603"
        schX={0}
        schY={3}
        schRotation={facesConnectedComponent ? 90 : 270}
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const sourceComponents = circuitJson.filter(
    (element) => element.type === "source_component",
  )
  const chipSourceComponent = sourceComponents.find(
    (component) => component.name === "U1",
  )
  const capacitorSourceComponent = sourceComponents.find(
    (component) => component.name === "C1",
  )
  const schematicComponents = circuitJson.filter(
    (element) => element.type === "schematic_component",
  )
  const chipComponent = schematicComponents.find(
    (component) =>
      component.source_component_id ===
      chipSourceComponent?.source_component_id,
  )
  const capacitorComponent = schematicComponents.find(
    (component) =>
      component.source_component_id ===
      capacitorSourceComponent?.source_component_id,
  )
  const schematicPorts = circuitJson.filter(
    (element): element is SchematicPort => element.type === "schematic_port",
  )
  const chipPort = schematicPorts.find(
    (port) =>
      port.schematic_component_id === chipComponent?.schematic_component_id &&
      port.pin_number === 1,
  )
  const capacitorPort = schematicPorts.find(
    (port) =>
      port.schematic_component_id ===
        capacitorComponent?.schematic_component_id && port.pin_number === 1,
  )
  if (!chipPort || !capacitorPort) {
    throw new Error("expected chip and capacitor pin 1 schematic ports")
  }

  const tracePoints = facesConnectedComponent
    ? [capacitorPort.center, chipPort.center]
    : [
        capacitorPort.center,
        { x: capacitorPort.center.x, y: capacitorPort.center.y + 0.5 },
        { x: capacitorPort.center.x + 0.5, y: capacitorPort.center.y + 0.5 },
        { x: capacitorPort.center.x + 0.5, y: chipPort.center.y },
        chipPort.center,
      ]

  circuitJson.push({
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_capacitor_to_chip",
    source_trace_id: "source_trace_capacitor_to_chip",
    edges: tracePoints.slice(1).map((point, index) => ({
      from: tracePoints[index]!,
      to: point,
    })),
    junctions: [],
  } satisfies SchematicTrace)

  return circuitJson
}
