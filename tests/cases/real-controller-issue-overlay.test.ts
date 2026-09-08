import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { wirelessMouseControllerSheetCircuitJson as circuitJson } from "../assets/wireless-mouse-controller-sheet"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("records every issue count and isolates the real controller's crystal report", () => {
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.entries(analysis.getIssueCounts()).filter(([, count]) => count > 0),
  ).toEqual([["CrystalNotCenteredOverLoadCapacitors", 1]])
  expect(analysis.getIssues()).toHaveLength(1)
  expect(analysis.getIssues({ issueTypes: [] })).toEqual([])
  const input = {
    circuitJson,
    analysis,
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors" as const],
  }
  const svg = createIssueOverlaySvg(input)
  expect(svg.match(/data-issue-index=/g)).toHaveLength(1)
  expect(svg).toContain('x="-10.6"') // X_HF_32M's real schematic bounds, not screen-space guesses
  expect(
    createIssueOverlaySvg({ ...input, issueTypes: ["ComponentOverlap"] }),
  ).not.toContain("data-issue-index=")
  expect(createIssueOverlaySvg({ ...input, showOverlay: false })).not.toContain(
    "placement-issue-overlays",
  )
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
