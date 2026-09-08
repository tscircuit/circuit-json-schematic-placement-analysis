import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createTextClearanceVariant(
  variant:
    | "rotated"
    | "multiline"
    | "boundary"
    | "clear"
    | "blank"
    | "reference"
    | "value",
  clear = false,
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const wireY = variant === "multiline" && clear ? 0.6 : 0
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      {variant === "reference" || variant === "value" ? (
        <>
          <chip
            name="U1"
            manufacturerPartNumber="MODEL"
            schX={0}
            schY={0}
            schWidth={2}
            schHeight={0.4}
            pinLabels={{ pin1: "IN" }}
          />
          <chip
            name="U2"
            schX={0}
            schY={variant === "reference" ? 0.5 : -0.5}
            schWidth={2}
            schHeight={0.4}
            pinLabels={{ pin1: "IN" }}
          />
        </>
      ) : (
        <>
          <chip
            name="U1"
            schX={-4}
            schY={wireY}
            pinLabels={{ pin1: "OUT" }}
            schPinArrangement={{ rightSide: [1] }}
          />
          <chip
            name="U2"
            schX={4}
            schY={wireY}
            pinLabels={{ pin1: "IN" }}
            schPinArrangement={{ leftSide: [1] }}
          />
          <trace from=".U1 > .OUT" to=".U2 > .IN" />
          <schematictext
            text={
              variant === "multiline"
                ? "TOP\n\nBOTTOM"
                : variant === "blank"
                  ? "  \n  "
                  : variant === "boundary"
                    ? "SIGNAL"
                    : "READABLE TEXT"
            }
            fontSize={0.6}
            anchor={
              variant === "boundary"
                ? "bottom_left"
                : variant === "rotated"
                  ? "center_left"
                  : "center"
            }
            schX={0}
            schY={
              variant === "multiline"
                ? 1.2
                : variant === "boundary"
                  ? 0
                  : variant === "rotated"
                    ? 0.8
                    : 2
            }
            schRotation={variant === "rotated" ? (clear ? -45 : 45) : 0}
          />
        </>
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
