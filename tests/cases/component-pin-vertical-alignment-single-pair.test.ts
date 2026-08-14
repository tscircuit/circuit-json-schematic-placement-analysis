import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createComponentPinVerticalAlignmentCircuitJson } from "../assets/component-pin-vertical-alignment"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not suggest a vertical shift for only one connected pin pair", async () => {
  const circuitJson = (
    await createComponentPinVerticalAlignmentCircuitJson()
  ).filter(
    (element) =>
      element.type !== "schematic_trace" ||
      element.schematic_trace_id !== "schematic_trace_pin2",
  )
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )

  expect(
    issues.some(
      (issue) =>
        issue.lineItemType === "ComponentPinsWouldAlignWithVerticalShift",
    ),
  ).toBe(false)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
