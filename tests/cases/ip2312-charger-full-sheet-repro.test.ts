import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import data from "../assets/ip2312-charger.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// https://tscircuit.com/krishnax12/ip2312-fast-charging-module @ 0.1.5
// Export release: 60221a81-45a3-4373-8ad2-3a601b51612a
// Original export SHA-256: a8bb34e02156d1f2d000dc8b6ccd9d083243943af6e0a482a94410af95d66e63
// All source_* and schematic_* records retained unchanged, including every sheet.
test("records the complete ip2312-charger schematic and current findings", () => {
  const circuitJson = data as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(26)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    SchematicPinPaddingToEdgeTooLarge: 2,
    DiodeResistorNotAligned: 1,
    NetLabelCollision: 1,
  })
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
