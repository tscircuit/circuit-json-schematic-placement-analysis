import type { CircuitJson } from "circuit-json"

/** Box-layout checks do not apply to built-in or custom schematic symbols.
 * Older box exports omit is_box_with_pins, so absence alone is not a veto. */
export function getSchematicBoxComponentIds(
  circuitJson: CircuitJson,
): Set<string> {
  return new Set(
    circuitJson.flatMap((element) =>
      element.type === "schematic_component" &&
      element.is_box_with_pins !== false &&
      !element.symbol_name &&
      !element.schematic_symbol_id
        ? [element.schematic_component_id]
        : [],
    ),
  )
}
