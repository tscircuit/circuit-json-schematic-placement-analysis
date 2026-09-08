import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTextClearanceVariant } from "../assets/text-clearance-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("checks a generated value label against an unrelated symbol", async () => {
  const circuitJson = await createTextClearanceVariant("value")
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = getPlacementIssues(analysis).filter(
    (e) => e.lineItemType === "SchematicTextCollision",
  )
  expect(
    issues.some(
      (e) =>
        e.text === "MODEL" &&
        e.schematicComponentId &&
        e.collidingObject.componentName === "U2",
    ),
  ).toBe(true)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
