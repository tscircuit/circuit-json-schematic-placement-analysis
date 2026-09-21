import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import data from "../assets/jst-programmer.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// https://tscircuit.com/tscircuit/standard-jst-programmer @ 0.7.0
// Export release: 17f7dead-90aa-4098-9155-a0475f699d32
// Original export SHA-256: d1e3b2e7bfe63d289ad9989eec8467d0033c269c09cddc6015e3ccf94e107aa8
// All source_* and schematic_* records retained unchanged, including every sheet.
test("records the complete jst-programmer schematic and current findings", () => {
  const circuitJson = data as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(60)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    SchematicPinPaddingToEdgeTooLarge: 1,
    TwoPinComponentCouldBeFlipped: 1,
    TwoPinComponentShouldBeVertical: 7,
    DecouplingCapacitorsNotCloseTogether: 4,
  })
  const sheets = [
    {
      id: "schematic_sheet_0",
      name: "MCU__supply",
      components: 13,
    },
    {
      id: "schematic_sheet_1",
      name: "MCU__processor",
      components: 25,
    },
    {
      id: "schematic_sheet_2",
      name: "MCU__target",
      components: 6,
    },
    {
      id: "schematic_sheet_3",
      name: "MCU__services",
      components: 16,
    },
  ]
  expect(
    circuitJson
      .filter((e) => e.type === "schematic_sheet")
      .map((e) => ({ id: e.schematic_sheet_id, name: e.name })),
  ).toEqual(sheets.map(({ id, name }) => ({ id, name })))
  for (const sheet of sheets) {
    expect(
      circuitJson.filter(
        (e) =>
          e.type === "schematic_component" && e.schematic_sheet_id === sheet.id,
      ),
    ).toHaveLength(sheet.components)
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis,
        schematicSheetId: sheet.id,
        showFullSchematic: true,
        showOverlay: false,
        width: 1800,
        height: 1200,
      }),
    ).toMatchSvgSnapshot(import.meta.path, sheet.name)
  }
  expect(JSON.stringify(circuitJson)).toBe(original)
})
