import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { escapeAttr } from "lib/utils/format"
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
  const message =
    "Labels TOP_AVDD (top) and BOTTOM_DVDD (bottom) overlap. Increase the schHeight to leave at least 0.1 schematic units between these labels."
  expect(collisionIssues).toMatchObject([
    {
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox: {
        sourceComponentName: "U2",
        width: 3,
        height: 2,
      },
      overlappingSides: ["top", "bottom"],
      message,
    },
  ])
  expect(collisionIssues[0]!.suggestedSchWidth).toBeUndefined()
  expect(collisionIssues[0]!.suggestedSchHeight).toBe(2.211)
  const resized = await createSchematicBoxInnerLabelCollisionCircuitJson({
    schHeight: collisionIssues[0]!.suggestedSchHeight,
  })
  expect(
    analyzeSchematicPlacement(resized).getIssues({
      issueTypes: ["SchematicBoxInnerLabelCollision"],
    }),
  ).toHaveLength(0)
  expect(collisionIssues[0]).not.toHaveProperty(
    "measuredInnerLabelHorizontalOverlap",
  )
  expect(collisionIssues[0]).not.toHaveProperty(
    "measuredInnerLabelVerticalOverlap",
  )

  expect(analysis.toString()).toContain(
    `<SchematicBoxInnerLabelCollision message="${escapeAttr(message)}" componentName="U2" currentSchWidth="3" currentSchHeight="2" overlappingSides="top,bottom" minimumLabelGap="0.1" suggestedSchHeight="2.211">`,
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicBoxInnerLabelCollision"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
