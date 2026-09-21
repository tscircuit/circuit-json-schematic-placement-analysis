import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stm32MiniDevBoard as circuitJson } from "../assets/stm32-mini-dev-board"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("highlights the low-side driver finding on the complete published STM32 sheet", () => {
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["LowSideTransistorNotAlignedWithLoad"],
  })
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    transistorSchematicBox: { sourceComponentName: "Q1" },
    loadSchematicBox: { sourceComponentName: "BZ1" },
    baseResistorSchematicBox: { sourceComponentName: "R6" },
    clampDiodeSchematicBox: { sourceComponentName: "D2" },
    placementProblems: [
      "transistor_not_below_load",
      "collector_not_up",
      "emitter_not_down",
    ],
  })
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes: ["LowSideTransistorNotAlignedWithLoad"],
    showFullSchematic: true,
    showListingIssueMarkers: true,
    width: 1800,
    height: 1200,
  })
  const number = String(analysis.getIssues().indexOf(issues[0]!) + 1)
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((m) => m[1]),
  ).toEqual(Array(4).fill(number))
  expect(svg).toContain(`data-listing-issue-number="${number}"`)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
