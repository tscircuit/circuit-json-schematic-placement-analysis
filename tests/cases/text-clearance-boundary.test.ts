import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTextClearanceVariant } from "../assets/text-clearance-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("does not flag boundary text geometry", async () => {
  const circuitJson = await createTextClearanceVariant("boundary")
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    getPlacementIssues(analysis).filter(
      (e) => e.lineItemType === "SchematicTextCollision",
    ),
  ).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
