import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { unreadableNetLabelCircuitJson } from "../assets/net-label-orientation-circuits"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("detects unreadable net label orientation", async () => {
  const analysis = analyzeSchematicPlacement(unreadableNetLabelCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  expect(issuesLineItem).toMatchObject({
    lineItemType: "SchematicPlacementIssues",
    issues: [
      {
        lineItemType: "NetLabelOrientationUnreadable",
        text: "GND",
        anchorSide: "left",
        currentAngleDeg: 135,
        normalizedAngleDeg: -45,
      },
    ],
  })

  expect(issuesLineItem?.issues).toHaveLength(1)

  expect(analysis.toString()).toContain(
    '<NetLabelOrientationUnreadable text="GND" anchorSide="left" currentAngleDeg="135" normalizedAngleDeg="-45" />',
  )

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: unreadableNetLabelCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})