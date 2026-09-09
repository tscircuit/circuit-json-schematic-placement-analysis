import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// Buck reference: LMR16020 Figure 22. Its output inductor is horizontal.
// https://www.ti.com/lit/ds/symlink/lmr16020.pdf#page=19
test("records the full power sheet's missing buck grouping and questionable inductor rotation", () => {
  const circuitJson = getRp2040BldcSheet("power")
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(19)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    GenericSchematicBoxTooWide: 1,
    SchematicBoxInnerLabelCollision: 1,
    SchematicPinPaddingToEdgeTooLarge: 12,
    SchematicTextCollision: 1,
    TwoPinComponentShouldBeVertical: 9,
    BuckConverterNetworkNotGrouped: 1,
  })
  expect(
    analysis
      .getIssues()
      .flatMap((issue) =>
        issue.lineItemType === "TraceCanBeSimplifiedByMovingComponent"
          ? [issue.targetComponent.sourceComponentName]
          : [],
      ),
  ).toEqual([])
  // Capture today's output for review, not an endorsement of rotating L_BUCK.
  expect(
    analysis
      .getIssues()
      .some(
        (issue) =>
          issue.lineItemType === "TwoPinComponentShouldBeVertical" &&
          issue.schematicBox.sourceComponentName === "L_BUCK",
      ),
  ).toBe(true)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      showFullSchematic: true,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
