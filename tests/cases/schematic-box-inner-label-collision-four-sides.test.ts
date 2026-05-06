import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
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
          (issue) => issue.lineItemType === "SchematicBoxTooSmall",
        )
      : []

  expect(collisionIssues).toHaveLength(1)
  expect(collisionIssues).toMatchObject([
    {
      lineItemType: "SchematicBoxTooSmall",
      schematicBox: {
        sourceComponentName: "U2",
        width: 1.25,
        height: 2,
      },
      overlappingSides: ["left", "right", "top", "bottom"],
      message:
        "Inner labels are colliding. Increase the schWidth or schHeight.",
    },
  ])
  expect(analysis.toString()).toContain(
    '<SchematicBoxTooSmall message="Inner labels are colliding. Increase the schWidth or schHeight." componentName="U2" currentSchWidth="1.25" currentSchHeight="2" overlappingSides="left,right,top,bottom" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
