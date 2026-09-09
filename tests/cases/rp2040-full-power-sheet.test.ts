import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// Buck reference: LMR16020 Figure 22. Its output inductor is horizontal.
// https://www.ti.com/lit/ds/symlink/lmr16020.pdf#page=19
test("identifies the full power sheet's scattered buck feedback network", () => {
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
  const issues = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "BuckConverterNetworkNotGrouped")
  expect(issues).toHaveLength(1)
  expect(issues[0]!.regulatorSchematicBox.sourceComponentName).toBe("U_BUCK")
  expect(
    issues[0]!.distantComponents.map(
      (part) => part.schematicBox.sourceComponentName,
    ),
  ).toEqual(["R_FB_TOP", "R_FB_BOT"])
  expect(
    issues[0]!.supportNetworkComponents.map((part) => part.sourceComponentName),
  ).toEqual(["L_BUCK", "R_FB_TOP", "R_FB_BOT", "C_BOOT_BUCK", "D_BUCK"])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["BuckConverterNetworkNotGrouped"],
      showFullSchematic: true,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
