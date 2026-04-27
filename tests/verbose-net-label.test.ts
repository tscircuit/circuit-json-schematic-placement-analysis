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
    message: "Create <trace /> with schDisplayLabel",
  })

  expect(analysis.toString()).toContain(
    'message="Create &lt;trace /&gt; with schDisplayLabel"',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: verboseNetLabelCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
