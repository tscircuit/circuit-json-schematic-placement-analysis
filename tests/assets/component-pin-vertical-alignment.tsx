import { Circuit } from "@tscircuit/core"
import type { CircuitJson, SchematicPort, SchematicTrace } from "circuit-json"

const PIN_LABELS = { pin1: "SCL", pin2: "SDA" }

export async function createComponentPinVerticalAlignmentCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U1"
        footprint="soic8"
        schX={-4}
        schY={0}
        schPinArrangement={{
          rightSide: {
            pins: ["pin1", "pin2"],
            direction: "top-to-bottom",
          },
        }}
        pinLabels={PIN_LABELS}
      />
      <chip
        name="U2"
        footprint="soic8"
        schX={4}
        schY={1}
        schPinArrangement={{
          leftSide: {
            pins: ["pin1", "pin2"],
            direction: "top-to-bottom",
          },
        }}
        pinLabels={PIN_LABELS}
        connections={{ pin1: "U1.pin1", pin2: "U1.pin2" }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const pin2Ports = circuitJson.filter(
    (element): element is SchematicPort =>
      element.type === "schematic_port" && element.pin_number === 2,
  )
  const [leftPin2, rightPin2] = pin2Ports.sort(
    (a, b) => a.center.x - b.center.x,
  )
  if (!leftPin2 || !rightPin2) throw new Error("expected two pin 2 ports")

  circuitJson.push({
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_pin2",
    source_trace_id: "source_trace_pin2",
    edges: [
      {
        from: leftPin2.center,
        to: { x: 0, y: leftPin2.center.y },
      },
      {
        from: { x: 0, y: leftPin2.center.y },
        to: { x: 0, y: rightPin2.center.y },
      },
      {
        from: { x: 0, y: rightPin2.center.y },
        to: rightPin2.center,
      },
    ],
    junctions: [],
  } satisfies SchematicTrace)

  return circuitJson
}
