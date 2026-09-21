import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import data from "../assets/neomouse-v2.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// https://tscircuit.com/jerrita/neomouse-v2 @ 1.0.0
// Export release: 7abec6a2-9ced-47d5-aed9-63100c65108f
// Original export SHA-256: fb175c03a61527ccc779e0b9aaa714daaadd1474732817b2d00e13e66a6d70c8
// All source_* and schematic_* records retained unchanged, including every sheet.
test("records the complete neomouse-v2 schematic and current findings", () => {
  const circuitJson = data as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(37)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    CrystalNotCenteredOverLoadCapacitors: 1,
    TwoPinComponentShouldBeVertical: 6,
    DecouplingCapacitorsNotCloseTogether: 3,
  })
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "",
      showFullSchematic: true,
      showOverlay: false,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
