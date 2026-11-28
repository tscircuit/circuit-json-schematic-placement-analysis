import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createVoltageDividerScatteredCircuitJson } from "../assets/voltage-divider-scattered"
import {
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("VoltageDividerNotCompact accepts compact dividers and skips ambiguous or filtered networks", async () => {
  const scattered = await createVoltageDividerScatteredCircuitJson()
  const getCompactnessIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json).getIssues({
      issueTypes: ["VoltageDividerNotCompact"],
    })

  expect(getCompactnessIssues(scattered)).toHaveLength(1)
  expect(analyzeSchematicPlacement(scattered).toString()).toContain(
    "<VoltageDividerNotCompact ",
  )

  const compact = structuredClone(scattered)
  const r1 = getReproSchematicComponent(compact, "R1")
  const r2 = getReproSchematicComponent(compact, "R2")
  r1.center.x = 1
  r1.center.y = 3
  r2.center.x = 1
  r2.center.y = 0.8
  for (const element of compact) {
    if (
      element.type === "schematic_port" &&
      element.schematic_component_id === r1.schematic_component_id
    ) {
      element.center.x += 6
    }
    if (
      element.type === "schematic_port" &&
      element.schematic_component_id === r2.schematic_component_id
    ) {
      element.center.x -= 2
      element.center.y += 3.8
    }
  }
  expect(getCompactnessIssues(compact)).toEqual([])

  const zeroOhm = structuredClone(scattered)
  for (const element of zeroOhm) {
    if (
      element.type === "source_component" &&
      element.ftype === "simple_resistor" &&
      element.name === "R1"
    ) {
      element.resistance = 0
    }
  }
  expect(getCompactnessIssues(zeroOhm)).toEqual([])

  const differentSheet = structuredClone(scattered)
  getReproSchematicComponent(differentSheet, "R1").schematic_sheet_id =
    "sheet_other"
  expect(getCompactnessIssues(differentSheet)).toEqual([])

  const noTapLoad = structuredClone(scattered)
  const adcPortId = getReproSourcePort(noTapLoad, "U1", "ADC").source_port_id
  delete getReproSourcePort(noTapLoad, "U1", "ADC")
    .subcircuit_connectivity_map_key
  for (const element of noTapLoad) {
    if (element.type === "source_trace") {
      element.connected_source_port_ids =
        element.connected_source_port_ids.filter((id) => id !== adcPortId)
    }
  }
  expect(getCompactnessIssues(noTapLoad)).toEqual([])
})
