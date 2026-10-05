import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import {
  createLocalPassiveSpacingFixture,
  getLocalSpacingComponent,
  inspectLocalPassiveSpacing,
} from "../fixtures/local-passive-spacing-fixture"

test("limits local spacing advice to one confirmed schematic sheet and local block", () => {
  const guards: Record<string, (json: CircuitJson) => void> = {
    "different-sheet": (json) => {
      getLocalSpacingComponent(json, "passive").schematic_sheet_id = "other"
      for (const e of json)
        if (
          e.type === "schematic_port" &&
          e.schematic_component_id === "sch_passive"
        )
          e.schematic_sheet_id = "other"
    },
    "different-schematic-block": (json) => {
      getLocalSpacingComponent(json, "passive").schematic_group_id = "other"
    },
    "different-source-block": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.source_component_id === "passive"
        )
          e.source_group_id = "other"
    },
    "different-subcircuit": (json) => {
      getLocalSpacingComponent(json, "passive").subcircuit_id = "other"
    },
    "different-source-subcircuit": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.source_component_id === "passive"
        )
          e.subcircuit_id = "other"
    },
    "inconsistent-port-sheet": (json) => {
      for (const e of json)
        if (
          e.type === "schematic_port" &&
          e.source_port_id === "passive_signal"
        )
          e.schematic_sheet_id = "other"
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = createLocalPassiveSpacingFixture()
    mutate(json)
    expect(inspectLocalPassiveSpacing(json, import.meta.path, name)).toEqual([])
  }
  const explicitSheet = createLocalPassiveSpacingFixture()
  for (const e of explicitSheet)
    if (
      e.type === "schematic_component" ||
      e.type === "schematic_port" ||
      e.type === "schematic_trace"
    )
      e.schematic_sheet_id = "local"
  expect(
    inspectLocalPassiveSpacing(
      explicitSheet,
      import.meta.path,
      "same-explicit-sheet",
    ),
  ).toHaveLength(1)
})
