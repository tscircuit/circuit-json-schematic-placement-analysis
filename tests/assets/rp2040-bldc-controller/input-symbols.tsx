import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { getRp2040BldcSheet } from "."

/** Re-render the real input-sheet symbols with their recorded pin arrangement
 * and labels. Only body dimensions vary; core generates all resulting geometry. */
export async function renderRp2040InputSymbol(
  name: "J_PD" | "U_PD",
  dimensions: { width?: number; height?: number } = {},
): Promise<CircuitJson> {
  const original = getRp2040BldcSheet("power_input")
  const source = original.find(
    (element) => element.type === "source_component" && element.name === name,
  )
  if (source?.type !== "source_component")
    throw new Error("Missing fixture source")
  const component = original.find(
    (element) =>
      element.type === "schematic_component" &&
      element.source_component_id === source.source_component_id,
  )
  if (component?.type !== "schematic_component")
    throw new Error("Missing fixture symbol")
  const arrangement = component.port_arrangement
  if (!arrangement || "left_size" in arrangement)
    throw new Error("Expected fixture pin lists for each occupied side")
  const pinSide = (
    side: typeof arrangement.left_side | typeof arrangement.top_side,
  ) => {
    if (!side) return undefined
    if (!side.direction)
      throw new Error("Expected an explicit fixture pin direction")
    return { pins: side.pins, direction: side.direction }
  }
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board routingDisabled>
      <chip
        name={name}
        manufacturerPartNumber={source.manufacturer_part_number}
        pinLabels={component.port_labels}
        schX={component.center.x}
        schY={component.center.y}
        schWidth={dimensions.width ?? component.size.width}
        schHeight={dimensions.height ?? component.size.height}
        schPinSpacing={component.pin_spacing}
        schPinArrangement={{
          leftSide: pinSide(arrangement.left_side),
          rightSide: pinSide(arrangement.right_side),
          topSide: pinSide(arrangement.top_side),
          bottomSide: pinSide(arrangement.bottom_side),
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
