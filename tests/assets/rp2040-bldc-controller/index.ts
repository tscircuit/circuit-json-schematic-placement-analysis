import type { CircuitJson } from "circuit-json"
import source from "./source.json"
import schematic from "./schematic.json"

// Rebuilt unchanged sources from @tsci/MustafaMulla29.rp2040-bldc-controller
// v1.0.55 in Desktop/tscircuit-repos/cli-repos/rp2040-bldc-controller on 2026-09-09.
// Toolchain: tscircuit 0.0.2474 (npm latest), core 0.0.1874, CLI 0.1.2033;
// @tscircuit/common 0.0.64 as declared by the source project.
// Render snapshots with this repository's existing renderer dependencies.
// Command: tsci build index.circuit.tsx --disable-pcb --schematic-svgs --ignore-errors
// Generated dist/index/circuit.json SHA-256:
// 5e4bed8e558d3a3374cad7be5e69a7071fc76cc667695f0837883f4c425b24ee
// Keep every source_* record (including cross-sheet connectivity) and every
// schematic_* record on these five complete sheets, plus shared schematic data.
// Only PCB/CAD data and the motor/protection sheets were omitted. No retained
// record was edited; positions, routes, IDs, labels, and sheet frames are original.
// Freeze this fresh output so future toolchain updates are reviewed explicitly.
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
