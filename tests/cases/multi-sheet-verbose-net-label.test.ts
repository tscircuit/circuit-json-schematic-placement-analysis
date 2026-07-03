import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetVerboseNetLabelCircuitJson } from "../assets/multi-sheet-verbose-net-label"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports verbose net labels on their schematic sheets", async () => {
  const circuitJson = await createMultiSheetVerboseNetLabelCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const verboseNetLabelIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "VerboseSchematicNetLabel",
        )
      : []

  expect(verboseNetLabelIssues).toHaveLength(4)
  expect(verboseNetLabelIssues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        schematicSheetName: "Power",
        text: "UP1_pin3/UP2_pin1",
        involvedPins: ["UP1.pin3", "UP2.pin1"],
      }),
      expect.objectContaining({
        schematicSheetName: "Power",
        text: "UP1_pin4/UP2_pin2",
        involvedPins: ["UP1.pin4", "UP2.pin2"],
      }),
      expect.objectContaining({
        schematicSheetName: "Logic",
        text: "UL1_pin3/UL2_pin1",
        involvedPins: ["UL1.pin3", "UL2.pin1"],
      }),
      expect.objectContaining({
        schematicSheetName: "Logic",
        text: "UL1_pin4/UL2_pin2",
        involvedPins: ["UL1.pin4", "UL2.pin2"],
      }),
    ]),
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
