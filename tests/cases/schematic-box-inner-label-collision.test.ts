import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicBoxInnerLabelCollisionCircuitJson } from "../assets/schematic-box-inner-label-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates an inner label collision issue for a chip", async () => {
  const circuitJson = await createSchematicBoxInnerLabelCollisionCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const collisionIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicBoxInnerLabelCollision",
        )
      : []

  expect(collisionIssues).toHaveLength(1)
  expect(collisionIssues).toMatchObject([
    {
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox: {
        sourceComponentName: "U2",
        width: 3,
        height: 2,
      },
      overlappingSides: ["top", "bottom"],
      message:
        "Inner labels are colliding. Increase the schWidth or schHeight.",
    },
  ])
  expect(collisionIssues[0]).not.toHaveProperty("suggestedWidth")
  expect(collisionIssues[0]).not.toHaveProperty("suggestedHeight")
  expect(collisionIssues[0]).not.toHaveProperty(
    "measuredInnerLabelHorizontalOverlap",
  )
  expect(collisionIssues[0]).not.toHaveProperty(
    "measuredInnerLabelVerticalOverlap",
  )

  expect(analysis.toString()).toContain(
    '<SchematicBoxInnerLabelCollision message="Inner labels are colliding. Increase the schWidth or schHeight." componentName="U2" currentSchWidth="3" currentSchHeight="2" overlappingSides="top,bottom" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
