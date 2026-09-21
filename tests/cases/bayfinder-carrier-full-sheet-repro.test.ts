import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import data from "../assets/bayfinder-carrier.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// https://tscircuit.com/liammcg/BayFinder_V1_REVC_ESP32_CARRIER @ 0.0.1
// Export release: 52d9c91b-3fbc-4fa4-bc04-4eaf7dcec406
// Original export SHA-256: 6a0f9a411ca11835a7ae365acff2d49f72974e9b29b78c52933992fef9fbff6c
// All source_* and schematic_* records retained unchanged, including every sheet.
test("records the complete bayfinder-carrier schematic and current findings", () => {
  const circuitJson = data as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(25)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    PinHeaderSchematicBoxTooWide: 5,
    DiodeResistorNotAligned: 2,
    NetLabelCollision: 1,
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
