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

/** The resize solvers model the box boundary, pins and their labels. Owned
 * drawing primitives have no resize/anchoring contract in Circuit JSON, so a
 * label-only resize cannot establish their clearance after changing the box.
 * This restriction is specific to resizing; label collision checks still run. */
export function getSchematicBoxResizeComponentIds(
  circuitJson: CircuitJson,
): Set<string> {
  const ids = getSchematicBoxComponentIds(circuitJson)
  for (const element of circuitJson) {
    switch (element.type) {
      case "schematic_path":
      case "schematic_line":
      case "schematic_rect":
      case "schematic_circle":
      case "schematic_arc":
      case "schematic_box":
        if (element.schematic_component_id)
          ids.delete(element.schematic_component_id)
    }
  }
  return ids
}
