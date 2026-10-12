import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { escapeAttr } from "lib/utils/format"
import { createSchematicBoxInnerLabelCollisionCircuitJson } from "../assets/schematic-box-inner-label-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a four-sided inner label collision issue", async () => {
  const circuitJson = await createSchematicBoxInnerLabelCollisionCircuitJson({
    schWidth: 1.25,
    schHeight: 2,
  })
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
        width: 1.25,
        height: 2,
      },
      overlappingSides: ["left", "right", "top", "bottom"],
    },
  ])
  const collision = collisionIssues[0]!
  expect(collision.message).toContain(
    "Labels ADC_AVDD (right) and VDV (left) overlap.",
  )
  expect(collision.message).toStartWith(
    "Labels IOVDD (right) and TOP_AVDD (top) are too close.",
  )
  expect(collision.message).toEndWith(
    "Increase the schWidth and schHeight to leave at least 0.1 schematic units between these labels.",
  )
  expect(analysis.toString()).toContain(
    `<SchematicBoxInnerLabelCollision message="${escapeAttr(collision.message)}" componentName="U2" currentSchWidth="1.25" currentSchHeight="2" overlappingSides="left,right,top,bottom" minimumLabelGap="0.1" suggestedSchWidth="2.125" suggestedSchHeight="2.211">`,
  )
  expect(collision.suggestedSchWidth).toBe(2.125)
  expect(collision.suggestedSchHeight).toBe(2.211)
  const resized = await createSchematicBoxInnerLabelCollisionCircuitJson({
    schWidth: collision.suggestedSchWidth,
    schHeight: collision.suggestedSchHeight,
  })
  expect(
    analyzeSchematicPlacement(resized).getIssues({
      issueTypes: ["SchematicBoxInnerLabelCollision"],
    }),
  ).toHaveLength(0)

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicBoxInnerLabelCollision"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
