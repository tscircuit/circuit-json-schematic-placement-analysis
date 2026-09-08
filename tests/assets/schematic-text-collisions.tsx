import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createSchematicTextCollisionCircuitJson(
  collision: "component" | "text",
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <chip
        name="U1"
        schX={-4}
        schY={0}
        schWidth={2}
        schHeight={0.4}
        pinLabels={{ pin1: "OUT" }}
        schPinArrangement={{
          rightSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <chip
        name="U2"
        schX={4}
        schY={0}
        pinLabels={{ pin1: "IN" }}
        schPinArrangement={{
          leftSide: { pins: ["pin1"], direction: "top-to-bottom" },
        }}
      />
      <trace from=".U1 > .OUT" to=".U2 > .IN" />
      {collision === "component" ? (
        // A free annotation, not an intentional label belonging to U1's symbol.
        <schematictext
          text="NOTE"
          fontSize={0.6}
          schX={-3.8}
          schY={0.32}
          anchor="center"
        />
      ) : (
        <>
          <schematictext
            text="TEST POINTS"
            fontSize={0.6}
            schX={0}
            schY={2}
            anchor="center"
          />
          <schematictext
            text="SERVICE ONLY"
            fontSize={0.6}
            schX={0}
            schY={2}
            anchor="center"
          />
        </>
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
