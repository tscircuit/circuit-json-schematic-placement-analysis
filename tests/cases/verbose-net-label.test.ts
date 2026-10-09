import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createVerboseNetLabelCircuitJson } from "../assets/verbose-net-label"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not flag shortened generated net labels as verbose", async () => {
  const verboseNetLabelCircuitJson = await createVerboseNetLabelCircuitJson()
  const analysis = analyzeSchematicPlacement(verboseNetLabelCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  expect(
    verboseNetLabelCircuitJson
      .filter((element) => element.type === "schematic_net_label")
      .map((label) => label.text),
  ).toEqual(["U1_pin2", "U1_pin2"])
  expect(
    analysis.getIssues({ issueTypes: ["VerboseSchematicNetLabel"] }),
  ).toEqual([])

  // U2's reference label crosses a wire in this fixture, but it moves with
  // U2. The independent-text analyzer must not suggest repositioning it.
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
  ).toEqual([])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: verboseNetLabelCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
