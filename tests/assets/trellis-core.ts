import type { CircuitJson } from "circuit-json"
import circuitJson from "./trellis-core.circuit.json"

// Published techmannih/trellis-core@0.2.9, release
// 7e27d896-d9e3-403f-a95f-3d1ccb54cddb. See trellis-core.md for provenance.
// All source_* and schematic_* records are preserved in their original order.
export const trellisCoreCircuitJson = circuitJson as CircuitJson

export function getTrellisCoreSheetCircuitJson(sheetName: string): CircuitJson {
  const sheet = trellisCoreCircuitJson.find(
    (element) =>
      element.type === "schematic_sheet" && element.name === sheetName,
  )
  if (sheet?.type !== "schematic_sheet") {
    throw new Error(`Missing Trellis Core sheet: ${sheetName}`)
  }
  // Keep the complete source connectivity, including nets shared across sheets.
  return trellisCoreCircuitJson.filter(
    (element) =>
      !element.type.startsWith("schematic_") ||
      ("schematic_sheet_id" in element &&
        element.schematic_sheet_id === sheet.schematic_sheet_id),
  )
}
