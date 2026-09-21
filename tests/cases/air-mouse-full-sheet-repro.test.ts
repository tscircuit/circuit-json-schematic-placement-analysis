import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import data from "../assets/air-mouse.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// https://tscircuit.com/hrithik18k/air-mouse @ 1.0.4
// Export release: 5a463021-5da4-4a78-b232-4a9a873b74d6
// Original export SHA-256: 719cf86e0b0a2216da6daf14db45f6f5e5f06c476ce3ec0259f5459982b3d520
// All source_* and schematic_* records retained unchanged, including every sheet.
test("records the complete air-mouse schematic and current findings", () => {
  const circuitJson = data as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(30)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    SchematicTextCollision: 1,
    TwoPinComponentShouldBeVertical: 11,
    DecouplingCapacitorsNotCloseTogether: 1,
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
