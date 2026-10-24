import type { CircuitJson } from "circuit-json"

/** Keep the rendered labels, moving their storage to the owning component. */
export function withComponentPinLabels(circuitJson: CircuitJson): CircuitJson {
  const result = structuredClone(circuitJson)
  const components = new Map(
    result
      .filter((element) => element.type === "schematic_component")
      .map((component) => [component.schematic_component_id, component]),
  )
  for (const port of result.filter((e) => e.type === "schematic_port")) {
    if (!port.schematic_component_id) continue
    const component = components.get(port.schematic_component_id)
    if (!component || port.display_pin_label === undefined) continue
    component.port_labels ??= {}
    component.port_labels[`${port.pin_number}`] = port.display_pin_label
    delete port.display_pin_label
  }
  return result
}
