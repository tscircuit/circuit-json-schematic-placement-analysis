import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import data from "../assets/infrared-battle-tag.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// https://tscircuit.com/mohan-bee/infrared-battle-tag @ 1.0.2
// Export release: 5ea00683-9c59-4c4e-b851-b85af4ac1c4e
// Original export SHA-256: 3a2f94f12bce2fe83f92b3d648a0a40350b177d07e09b2179337886131b1ea40
// All source_* and schematic_* records retained unchanged, including every sheet.
test("records the complete infrared-battle-tag schematic and current findings", () => {
  const circuitJson = data as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(24)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({})
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_0",
      showFullSchematic: true,
      showOverlay: false,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
