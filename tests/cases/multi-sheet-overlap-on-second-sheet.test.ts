import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetOverlapOnSecondSheetCircuitJson } from "../assets/multi-sheet-overlapping-boxes"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reports component overlap only for components sharing the same schematic sheet", async () => {
  const circuitJson = await createMultiSheetOverlapOnSecondSheetCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const overlapIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "ComponentOverlap",
        )
      : []

  expect(overlapIssues).toHaveLength(1)
  expect(overlapIssues[0]).toMatchObject({
    lineItemType: "ComponentOverlap",
    firstComponent: {
      sourceComponentName: "LED_STATUS",
      schematicSheetName: "Logic",
    },
    secondComponent: {
      sourceComponentName: "R_BOOT",
      schematicSheetName: "Logic",
    },
  })
  expect(analysis.toString()).toContain('component1Name="LED_STATUS"')
  expect(analysis.toString()).toContain('component2Name="R_BOOT"')
  expect(analysis.toString()).not.toContain('component1Name="C_BULK"')
  expect(
    analysis
      .getLineItems()
      .filter((lineItem) => lineItem.lineItemType === "SchematicBoxPlacement")
      .map((placement) => placement.sourceComponentName),
  ).toEqual(["LED_STATUS", "R_BOOT"])
  expect(analysis.toString()).toContain('<SchematicSheet name="Logic"')
  expect(analysis.toString()).not.toContain('name="Power"')

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
