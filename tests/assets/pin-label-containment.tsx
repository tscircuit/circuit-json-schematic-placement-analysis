import { Circuit } from "@tscircuit/core"
import type { SchematicSide } from "lib/types"

export async function createPinLabelContainmentCircuitJson(options: {
  side: SchematicSide
  width?: number
  height?: number
  labels?: string[]
  x?: number
  y?: number
}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const labels = options.labels ?? ["A", "B"]
  const pins = labels.map((_, i) => i + 1)
  circuit.add(
    <board routingDisabled>
      <chip
        name="U1"
        schX={options.x ?? 0}
        schY={options.y ?? 0}
        schWidth={options.width ?? 2}
        schHeight={options.height ?? 2}
        schPinSpacing={0.2}
        pinLabels={Object.fromEntries(
          labels.map((label, i) => [`pin${i + 1}`, label]),
        )}
        schPinArrangement={{
          [`${options.side}Side`]: {
            pins,
            direction:
              options.side === "left" || options.side === "right"
                ? "top-to-bottom"
                : "left-to-right",
          },
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
