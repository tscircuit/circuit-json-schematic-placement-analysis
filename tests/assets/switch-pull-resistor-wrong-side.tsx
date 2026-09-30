import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

/** Reproduces the RUN button's long loop to a pull-up below the button. */
export async function createSwitchPullResistorCircuitJson({
  layout = "bad",
  switchType = "pushbutton",
  switchRotation,
  resistorY,
}: {
  layout?: "bad" | "vertical" | "horizontal" | "mixed"
  switchType?: "pushbutton" | "switch"
  switchRotation?: number
  resistorY?: number
} = {}): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="V3V3" isPowerNet />
      <net name="GND" isGroundNet />
      <net name="RUN" />
      {switchType === "pushbutton" ? (
        <pushbutton
          name="SW_RUN"
          schX={0}
          schY={0}
          schRotation={switchRotation ?? (layout === "vertical" ? 270 : 0)}
        />
      ) : (
        <switch
          name="SW_RUN"
          spst
          schX={0}
          schY={0}
          schRotation={switchRotation ?? (layout === "vertical" ? 270 : 0)}
        />
      )}
      <resistor
        name="R_RUN"
        resistance="10k"
        schX={layout === "horizontal" ? -2 : layout === "mixed" ? -1 : 0}
        schY={
          resistorY ??
          (layout === "bad" ? -4 : layout === "horizontal" ? 0 : 1.5)
        }
        schRotation={layout === "horizontal" ? 180 : 90}
      />
      <trace from=".R_RUN > .pin1" to="net.RUN" />
      <trace from=".SW_RUN > .pin1" to="net.RUN" />
      <trace from=".R_RUN > .pin2" to="net.V3V3" />
      <trace from=".SW_RUN > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
