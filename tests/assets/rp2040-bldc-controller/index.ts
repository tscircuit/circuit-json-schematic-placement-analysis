import type { CircuitJson } from "circuit-json"
import source from "./source.json"
import schematic from "./schematic.json"

// Saved dist/index/circuit.json from @tsci/MustafaMulla29.rp2040-bldc-controller
// v1.0.55 in Desktop/tscircuit-repos/cli-repos/rp2040-bldc-controller.
// Original export SHA-256:
// c2783ee552dc6cde168e3232e116f36fefc5fb71ff9774a5dece2fecbc5f0fcf
// Keep every source_* record (including cross-sheet connectivity) and every
// schematic_* record on these five complete sheets, plus shared schematic data.
// Only PCB/CAD data and the motor/protection sheets were omitted. No retained
// record was edited; positions, routes, IDs, labels, and sheet frames are original.
// Import the saved output directly so rebuilding cannot change the layout repro.
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
