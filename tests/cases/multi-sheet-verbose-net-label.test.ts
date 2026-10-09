import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetVerboseNetLabelCircuitJson } from "../assets/multi-sheet-verbose-net-label"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not flag shortened generated labels on either sheet as verbose", async () => {
  const circuitJson = await createMultiSheetVerboseNetLabelCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const sheets = circuitJson.filter(
    (element) => element.type === "schematic_sheet",
  )
  expect(sheets.map((sheet) => sheet.name)).toEqual(["Power", "Logic"])
  for (const sheet of sheets) {
    const prefix = sheet.name === "Power" ? "UP1" : "UL1"
    expect(
      circuitJson
        .filter((element) => element.type === "schematic_net_label")
        .filter(
          (label) => label.schematic_sheet_id === sheet.schematic_sheet_id,
        )
        .map((label) => label.text),
    ).toEqual([
      `${prefix}_pin3`,
      `${prefix}_pin3`,
      `${prefix}_pin4`,
      `${prefix}_pin4`,
    ])
  }
  expect(
    analysis.getIssues({ issueTypes: ["VerboseSchematicNetLabel"] }),
  ).toEqual([])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
