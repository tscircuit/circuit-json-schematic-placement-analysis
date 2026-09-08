import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createTextClearanceExportControl(
  customSymbol = false,
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      {customSymbol ? (
        <>
          <chip
            name="Q1"
            schX={0}
            schY={0}
            symbol={
              <symbol>
                <schematiccircle
                  center={{ x: 0, y: 0 }}
                  radius={0.5}
                  strokeWidth={0.02}
                />
                <port name="pin1" direction="left" schX={-0.8} schY={0} />
              </symbol>
            }
          />
          <schematictext text="Q1" schX={0.48} schY={0.48} fontSize={0.1} />
        </>
      ) : (
        <>
          <chip
            name="U1"
            schX={-4}
            schY={0}
            pinLabels={{ pin1: "OUT" }}
            schPinArrangement={{ rightSide: [1] }}
          />
          <chip
            name="U2"
            schX={4}
            schY={0}
            pinLabels={{ pin1: "IN" }}
            schPinArrangement={{ leftSide: [1] }}
          />
          <trace from=".U1 > .OUT" to=".U2 > .IN" />
          <schematictext text="100V" schX={0} schY={0.1} fontSize={0.22} />
          <schematictext text="100V" schX={0} schY={0.1} fontSize={0.22} />
        </>
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
