import { expect, test } from "bun:test"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { createPocketAudioFilteredDivider } from "../assets/pocket-audio-filtered-divider"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"
import {
  electricalSignature,
  expectVisibleConnection,
} from "../fixtures/placement-correction-assertions"
test("groups the entire filtered divider without changing components or pin connections", async () => {
  const before = await createPocketAudioFilteredDivider("oriented"),
    after = await createPocketAudioFilteredDivider("after")
  expectReproRendered(before, 3)
  expectReproRendered(after, 3)
  expect(electricalSignature(after)).toEqual(electricalSignature(before))
  const analysis = analyzeSchematicPlacement(before),
    corrected = analyzeSchematicPlacement(after),
    issues = analysis.getIssues()
  expect(issues.map((i) => i.lineItemType)).toEqual([
    "VoltageDividerNetworkNotGrouped",
  ])
  expect(corrected.getIssues()).toEqual([])
  expectVisibleConnection(after, "R_BAT_TOP", "pin2", "R_BAT_BOT", "pin1")
  expectVisibleConnection(after, "R_BAT_BOT", "pin1", "C_ADC_BAT", "pin1")
  expectVisibleConnection(after, "R_BAT_BOT", "pin2", "C_ADC_BAT", "pin2")
  expect(
    createPlacementComparisonSvg({
      subject: "complete filtered divider",
      centerEachPanel: true,
      panelHeight: 850,
      padding: { left: 1.5, right: 2, top: 1.5, bottom: 1.5 },
      backgroundColor: "#f5f1ed",
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues,
      beforeDiagnostic: () =>
        "R_BAT_TOP / R_BAT_BOT / C_ADC_BAT: divider and shunt capacitor are spread apart.",
      afterDiagnostic:
        "Divider and filter capacitor form one compact network.\nComplete 3-component extract: 0 reported issues.",
      note: "Source positions retained before; existing resistor rotation advice already applied. Values and connections preserved.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: after,
          analysis: corrected,
          showFullSchematic: true,
          showOverlay: false,
          width: 1400,
          height: 700,
        }).svg,
        createAnalyzerTextSvg(
          "Complete filtered divider extract: 3 components.\nFull analysis: 0 reported issues.",
          1400,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-network")
})
