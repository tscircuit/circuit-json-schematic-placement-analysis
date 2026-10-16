import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

export async function createNearTouchingPinLabelsCircuitJson(
  options: { vertical?: boolean; dimension?: number } = {},
): Promise<CircuitJson> {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const vertical = options.vertical ?? false
  const dimension = options.dimension ?? 1.3
  circuit.add(
    <board routingDisabled>
      <chip
        name="Q1"
        manufacturerPartNumber="2N7002,215"
        schWidth={vertical ? 0.6 : dimension}
        schHeight={vertical ? dimension : 0.6}
        pinLabels={{ pin1: "GATE", pin2: "SOURCE", pin3: "DRAIN" }}
        schPinArrangement={
          vertical
            ? { topSide: [1, 2], bottomSide: [3] }
            : { leftSide: [1, 2], rightSide: [3] }
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
