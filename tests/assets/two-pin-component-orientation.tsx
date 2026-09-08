import { Circuit } from "@tscircuit/core"
import type { CircuitJson, SchematicPort, SchematicTrace } from "circuit-json"

export async function createTwoPinComponentOrientationCircuitJson({
  facesConnectedComponent,
  componentKind = "capacitor",
  rail,
  railPin = 2,
}: {
  facesConnectedComponent: boolean
  componentKind?: "capacitor" | "resistor"
  rail?: "power" | "ground"
  railPin?: 1 | 2
}): Promise<CircuitJson> {
  const circuit = new Circuit()
  const componentName = componentKind === "capacitor" ? "C1" : "R1"

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
      {componentKind === "capacitor" ? (
        <capacitor
          name={componentName}
          capacitance="1uF"
          footprint="0603"
          schX={0}
          schY={3}
          schRotation={facesConnectedComponent ? 90 : 270}
        />
      ) : (
        <resistor
          name={componentName}
          resistance="10k"
          footprint="0603"
          schX={0}
          schY={3}
          schRotation={facesConnectedComponent ? 90 : 270}
        />
      )}
      {rail && (
        <>
          <net
            name="RAIL_A"
            isPowerNet={rail === "power"}
            isGroundNet={rail === "ground"}
          />
          <trace from={`.${componentName} > .pin${railPin}`} to="net.RAIL_A" />
        </>
      )}
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
  const targetSourceComponent = sourceComponents.find(
    (component) => component.name === componentName,
  )
  const schematicComponents = circuitJson.filter(
    (element) => element.type === "schematic_component",
  )
  const chipComponent = schematicComponents.find(
    (component) =>
      component.source_component_id ===
      chipSourceComponent?.source_component_id,
  )
  const targetComponent = schematicComponents.find(
    (component) =>
      component.source_component_id ===
      targetSourceComponent?.source_component_id,
  )
  const schematicPorts = circuitJson.filter(
    (element): element is SchematicPort => element.type === "schematic_port",
  )
  const chipPort = schematicPorts.find(
    (port) =>
      port.schematic_component_id === chipComponent?.schematic_component_id &&
      port.pin_number === 1,
  )
  const targetPort = schematicPorts.find(
    (port) =>
      port.schematic_component_id === targetComponent?.schematic_component_id &&
      port.pin_number === 1,
  )
  if (!chipPort || !targetPort) {
    throw new Error("expected chip and two-pin component pin 1 schematic ports")
  }

  const tracePoints = facesConnectedComponent
    ? [targetPort.center, chipPort.center]
    : [
        targetPort.center,
        { x: targetPort.center.x, y: targetPort.center.y + 0.5 },
        { x: targetPort.center.x + 0.5, y: targetPort.center.y + 0.5 },
        { x: targetPort.center.x + 0.5, y: chipPort.center.y },
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
