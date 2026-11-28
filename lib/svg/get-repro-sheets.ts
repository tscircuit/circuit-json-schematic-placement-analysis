import type { CircuitJson } from "circuit-json"

export function getReproSheets(circuitJson: CircuitJson) {
  const ids = new Set(
    circuitJson.flatMap((element) =>
      element.type.startsWith("schematic_") &&
      !element.type.endsWith("_warning") &&
      !element.type.endsWith("_error") &&
      element.type !== "schematic_symbol" &&
      !(
        element.type === "schematic_group" &&
        element.is_subcircuit &&
        !element.show_as_schematic_box
      )
        ? [
            ("schematic_sheet_id" in element
              ? element.schematic_sheet_id
              : undefined) ?? "",
          ]
        : [],
    ),
  )
  return [...ids].map((id) => {
    const sheet = circuitJson.find(
      (element) =>
        element.type === "schematic_sheet" && element.schematic_sheet_id === id,
    )
    return {
      id,
      name:
        sheet?.type === "schematic_sheet"
          ? sheet.name || id
          : id || "Unassigned sheet",
    }
  })
}
