import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createComponentPinVerticalAlignmentCircuitJson } from "../assets/component-pin-vertical-alignment"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("suggests a vertical shift when it aligns multiple connected pin pairs", async () => {
  const circuitJson = await createComponentPinVerticalAlignmentCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
  const alignmentIssue = issues.find(
    (issue) =>
      issue.lineItemType === "ComponentPinsWouldAlignWithVerticalShift",
  )

  expect(alignmentIssue).toMatchObject({
    targetComponent: { sourceComponentName: "U2" },
    deltaSchY: -1,
    newSchY: 0,
    currentlyAlignedPinCount: 0,
    alignedPinCount: 2,
    alignedPinPairs: [
      { firstPin: "SCL", secondPin: "SCL" },
      { firstPin: "SDA", secondPin: "SDA" },
    ],
  })
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
