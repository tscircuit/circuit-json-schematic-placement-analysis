import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { stm32MiniDevBoard as circuitJson } from "../assets/stm32-mini-dev-board"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("highlights the low-side driver finding on the complete unchanged STM32 board", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(
    circuitJson.filter((e) => e.type.startsWith("schematic_")),
    29,
  )
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
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
