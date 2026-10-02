import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createVerboseNetLabelCircuitJson } from "../assets/verbose-net-label"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

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
    message: "Create trace with schDisplayLabel",
  })

  expect(
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "VerboseSchematicNetLabel",
        )
      : [],
  ).toHaveLength(1)

  expect(analysis.toString()).toContain(
    'message="Create trace with schDisplayLabel" text="R1_pin2/U1_pin2" involvedPins="R1.pin2,U1.pin2"',
  )

  // U2's reference crosses a wire and a net label. Report both, without
  // suggesting an independent move for text that belongs to the component.
  const componentLabel = verboseNetLabelCircuitJson.find(
    (element) => element.type === "schematic_text" && element.text === "U2",
  )
  if (componentLabel?.type !== "schematic_text")
    throw new Error("Missing U2 reference label")
  expect(componentLabel.schematic_component_id).toBeString()
  expect(
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicTextCollision",
        )
      : [],
  ).toMatchObject([
    {
      text: "U2",
      collidingObject: { type: "trace" },
      suggestedMove: undefined,
    },
    {
      text: "U2",
      collidingObject: { type: "net_label" },
      suggestedMove: undefined,
    },
  ])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: verboseNetLabelCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
