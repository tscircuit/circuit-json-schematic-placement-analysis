import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTextClearanceSheets } from "../assets/text-clearance-sheets"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("reports text collisions only within their own schematic sheet", async () => {
  const circuitJson = await createTextClearanceSheets()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = getPlacementIssues(analysis).filter(
    (e) => e.lineItemType === "SchematicTextCollision",
  )
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    schematicSheetName: "First",
    text: "FIRST HEADING",
    collidingObject: { type: "text", text: "OVERLAPPING NOTE" },
  })
  expect(analysis.toString()).toContain('<SchematicSheet name="First"')
  expect(analysis.toString()).not.toContain('<SchematicSheet name="Second"')
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
