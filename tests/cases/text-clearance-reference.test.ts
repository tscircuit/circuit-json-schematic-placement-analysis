import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTextClearanceVariant } from "../assets/text-clearance-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("checks a generated reference label against an unrelated symbol", async () => {
  const circuitJson = await createTextClearanceVariant("reference")
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = getPlacementIssues(analysis).filter(
    (e) => e.lineItemType === "SchematicTextCollision",
  )
  expect(
    issues.some(
      (e) =>
        e.text === "U1" &&
        e.schematicComponentId &&
        e.collidingObject.componentName === "U2",
    ),
  ).toBe(true)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
