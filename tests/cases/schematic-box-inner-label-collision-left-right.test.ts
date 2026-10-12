import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { escapeAttr } from "lib/utils/format"
import { createSchematicBoxInnerLabelCollisionCircuitJson } from "../assets/schematic-box-inner-label-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("generates a left-right inner label collision issue", async () => {
  const circuitJson = await createSchematicBoxInnerLabelCollisionCircuitJson({
    schWidth: 1.25,
    schHeight: 4,
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
  const message =
    "Labels ADC_AVDD (right) and VDD (left) are too close. Labels ADC_AVDD (right) and VDV (left) overlap. Increase the schWidth to leave at least 0.1 schematic units between these labels."
  expect(collisionIssues).toMatchObject([
    {
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox: {
        sourceComponentName: "U2",
        width: 1.25,
        height: 4,
      },
      overlappingSides: ["left", "right"],
      message,
    },
  ])
  expect(analysis.toString()).toContain(
    `<SchematicBoxInnerLabelCollision message="${escapeAttr(message)}" componentName="U2" currentSchWidth="1.25" currentSchHeight="4" overlappingSides="left,right" minimumLabelGap="0.1" suggestedSchWidth="1.389">`,
  )
  expect(collisionIssues[0]!.suggestedSchHeight).toBeUndefined()
  const resized = await createSchematicBoxInnerLabelCollisionCircuitJson({
    schWidth: collisionIssues[0]!.suggestedSchWidth,
    schHeight: 4,
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
