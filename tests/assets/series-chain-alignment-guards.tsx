import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createSeriesChainGuardCircuitJson(
  variant: "horizontal" | "vertical" | "diode",
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  if (variant === "horizontal") {
    circuit.add(
      <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
        <resistor name="R1" resistance="100" schX={-4} schY={0} />
        <inductor name="L1" inductance="10uH" schX={0} schY={0} />
        <resistor name="R2" resistance="100" schX={4} schY={0} />
        <trace from=".R1 > .pin1" to="net.IN" />
        <trace from=".R1 > .pin2" to=".L1 > .pin1" />
        <trace from=".L1 > .pin2" to=".R2 > .pin1" />
        <trace from=".R2 > .pin2" to="net.OUT" />
      </board>,
    )
  } else if (variant === "vertical") {
    circuit.add(
      <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
        <resistor
          name="R1"
          resistance="1k"
          schX={0}
          schY={4}
          schRotation={-90}
        />
        <capacitor
          name="C1"
          capacitance="100nF"
          schX={0}
          schY={0}
          schRotation={-90}
        />
        <resistor
          name="R2"
          resistance="1k"
          schX={0}
          schY={-4}
          schRotation={-90}
        />
        <trace from=".R1 > .pin1" to="net.IN" />
        <trace from=".R1 > .pin2" to=".C1 > .pin1" />
        <trace from=".C1 > .pin2" to=".R2 > .pin1" />
        <trace from=".R2 > .pin2" to="net.OUT" />
      </board>,
    )
  } else {
    circuit.add(
      <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
        <resistor name="R1" resistance="100" schX={-4} schY={2} />
        <diode name="D1" schX={0} schY={-2} schRotation={90} />
        <resistor name="R2" resistance="100" schX={4} schY={0} />
        <trace from=".R1 > .pin1" to="net.IN" />
        <trace from=".R1 > .pin2" to=".D1 > .anode" />
        <trace from=".D1 > .cathode" to=".R2 > .pin1" />
        <trace from=".R2 > .pin2" to="net.OUT" />
      </board>,
    )
  }
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
