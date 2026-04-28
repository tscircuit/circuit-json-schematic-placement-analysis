import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "./fixtures/create-schematic-analysis-fixture-svg"
import { createVerboseNetLabelCircuitJson } from "./fixtures/verbose-net-label"

test("generates a verbose schematic net label issue", async () => {
  const verboseNetLabelCircuitJson = await createVerboseNetLabelCircuitJson()
  const analysis = analyzeSchematicPlacement(verboseNetLabelCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const verboseNetLabelIssue =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.find(
          (issue) => issue.lineItemType === "VerboseSchematicNetLabel",
        )
      : undefined

  expect(verboseNetLabelIssue).toMatchObject({
    lineItemType: "VerboseSchematicNetLabel",
    text: "R1_pin2/U1_pin2",
    involvedPins: ["R1.pin2", "U1.pin2"],
    message: "Create <trace /> with schDisplayLabel",
  })

  expect(
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "VerboseSchematicNetLabel",
        )
      : [],
  ).toHaveLength(1)

  expect(analysis.toString()).toContain(
    'message="Create <trace /> with schDisplayLabel" text="R1_pin2/U1_pin2" involvedPins="R1.pin2,U1.pin2"',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: verboseNetLabelCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
