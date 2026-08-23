import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetDifferentLayoutsCircuitJson } from "../assets/multi-sheet-overlapping-boxes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not report overlaps for different layouts on separate schematic sheets", async () => {
  const circuitJson = await createMultiSheetDifferentLayoutsCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(analysis.getLineItems()).toEqual([])
  expect(
    analysis
      .getLineItems()
      .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues"),
  ).toBeUndefined()
  expect(analysis.toString()).toBe("")

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
