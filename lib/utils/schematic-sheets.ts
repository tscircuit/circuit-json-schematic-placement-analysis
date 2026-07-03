import type { CircuitJson } from "circuit-json"

export const getSchematicSheetNameByIdMap = (
  circuitJson: CircuitJson,
): Map<string, string> => {
  const map = new Map<string, string>()
  for (const element of circuitJson) {
    if (element.type === "schematic_sheet" && element.name) {
      map.set(element.schematic_sheet_id, element.name)
    }
  }
  return map
}
