import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import { createSchematicPinPaddingToEdgeAllSidesCircuitJson } from "../assets/schematic-pin-padding-to-edge-all-sides"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { measureLabelBankGap } from "../fixtures/measure-label-bank-gap"

test("generates schematic pin padding to edge issues for labels on all sides", async () => {
  const circuitJson = await createSchematicPinPaddingToEdgeAllSidesCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const pinPaddingIssues =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.filter(
          (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
        )
      : []

  expect(pinPaddingIssues).toHaveLength(1)
  const issue = pinPaddingIssues[0]!
  expect(issue.paddingDetails).toHaveLength(4)
  expect(
    new Set(issue.paddingDetails!.map((detail) => detail.pinSide)),
  ).toEqual(new Set(["top", "bottom"]))
  for (const detail of issue.paddingDetails!) {
    expect(detail.excessPadding).toBeCloseTo(
      detail.measuredPadding - detail.maxAllowedPadding,
      10,
    )
  }
  expect(issue.suggestedSchWidth).toBeCloseTo(0.97, 10)
  expect(issue.suggestedSchHeight).toBeUndefined()
  expect(issue.message).toEndWith("width")
  expect(
    analysis.toString().match(/<SchematicPinPaddingToEdgeTooLarge /g),
  ).toHaveLength(1)

  // Reducing both dimensions to the old targets would crowd corner labels.
  // The next height suggestion accounts for the now-narrower body.
  const narrower = await createSchematicPinPaddingToEdgeAllSidesCircuitJson({
    schWidth: issue.suggestedSchWidth,
  })
  const narrowerAnalysis = analyzeSchematicPlacement(narrower)
  expect(measureLabelBankGap(narrower) + 1e-9).toBeGreaterThanOrEqual(0.2)
  const remaining = narrowerAnalysis
    .getIssues()
    .filter(
      (finding) => finding.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  expect(remaining).toHaveLength(1)
  expect(remaining[0]!.suggestedSchWidth).toBeUndefined()
  expect(remaining[0]!.suggestedSchHeight).toBeCloseTo(2.09)
  expect(
    new Set(remaining[0]!.paddingDetails!.map((detail) => detail.pinSide)),
  ).toEqual(new Set(["left", "right"]))
  const compact = await createSchematicPinPaddingToEdgeAllSidesCircuitJson({
    schWidth: issue.suggestedSchWidth,
    schHeight: remaining[0]!.suggestedSchHeight,
  })
  const compactAnalysis = analyzeSchematicPlacement(compact)
  expect(measureLabelBankGap(compact) + 1e-9).toBeGreaterThanOrEqual(0.2)
  expect(compactAnalysis.getIssues()).toHaveLength(0)
  await expect(
    stackSvgsVertically(
      [
        createIssueReproSnapshot({
          circuitJson,
          analysis,
          width: 1200,
          height: 500,
          showFullSchematic: true,
          showOverlay: false,
        }),
        createIssueReproSnapshot({
          circuitJson: narrower,
          analysis: narrowerAnalysis,
          width: 1200,
          height: 500,
          showFullSchematic: true,
          showOverlay: false,
        }),
        createIssueReproSnapshot({
          circuitJson: compact,
          analysis: compactAnalysis,
          width: 1200,
          height: 500,
          showFullSchematic: true,
          showOverlay: false,
        }),
      ],
      { normalizeSize: false, gap: 0 },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
