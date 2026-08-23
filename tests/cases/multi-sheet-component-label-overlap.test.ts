import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetComponentLabelOverlapCircuitJson } from "../assets/multi-sheet-component-label-overlap"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("groups net-label collision issues and relevant boxes by sheet", async () => {
  const circuitJson = await createMultiSheetComponentLabelOverlapCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
  const collisionIssues = issues.filter(
    (issue) => issue.lineItemType === "NetLabelCollision",
  )

  expect(collisionIssues).toHaveLength(2)
  expect(collisionIssues.map((issue) => issue.schematicSheetName)).toEqual([
    "Power",
    "Logic",
  ])
  const output = analysis.toString()
  const powerSheetStart = output.indexOf('<SchematicSheet name="Power"')
  const logicSheetStart = output.indexOf('<SchematicSheet name="Logic"')
  expect(powerSheetStart).toBeGreaterThanOrEqual(0)
  expect(logicSheetStart).toBeGreaterThan(powerSheetStart)
  expect(output.slice(powerSheetStart, logicSheetStart)).not.toContain("UL")
  expect(output.slice(logicSheetStart)).not.toContain("UP")

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
