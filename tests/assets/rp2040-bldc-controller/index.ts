import type { CircuitJson } from "circuit-json"
import source from "./source.json"
import schematic from "./schematic.json"

export const rp2040BldcCircuitJson = [
  ...source,
  ...schematic,
] as unknown as CircuitJson

const sheetIds = {
  controller: "schematic_sheet_0",
  hall: "schematic_sheet_1",
  encoder: "schematic_sheet_2",
  power_input: "schematic_sheet_3",
  power: "schematic_sheet_4",
} as const

export function getRp2040BldcSheet(name: keyof typeof sheetIds): CircuitJson {
  return rp2040BldcCircuitJson.filter(
    (element) =>
      !element.type.startsWith("schematic_") ||
      !("schematic_sheet_id" in element) ||
      !element.schematic_sheet_id ||
      element.schematic_sheet_id === sheetIds[name],
  )
}
