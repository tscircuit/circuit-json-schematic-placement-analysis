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
  const viewBox = svg.match(/viewBox="([^"]+)"/)![1]!
  const frame = viewBox.split(" ").map(Number)
  const matrix = svg
    .match(/data-real-to-screen-transform="matrix\(([^)]+)\)"/)![1]!
    .split(",")
    .map(Number)
  // The selected boxes span [-10.6, -3.55] x [-8.3, -5.8]. Add half a
  // bounds-width/height on every side, then project into the renderer's space.
  expect(frame[0]).toBeCloseTo(-14.125 * matrix[0]! + matrix[4]!)
  expect(frame[1]).toBeCloseTo(-4.55 * matrix[3]! + matrix[5]!)
  expect(frame[2]).toBeCloseTo(14.1 * matrix[0]!)
  expect(frame[3]).toBeCloseTo(5 * Math.abs(matrix[3]!))
  expect(createIssueOverlaySvg({ ...input, showOverlay: false })).toContain(
    `viewBox="${viewBox}"`,
  )
  expect(createIssueOverlaySvg({ ...input, issueTypes: [] })).not.toContain(
    "viewBox=",
  )
  const overlay = svg.slice(svg.indexOf('<g class="placement-issue-overlays">'))
  expect(overlay).toContain('stroke-width="0.5"')
  expect(overlay).not.toContain('stroke-width="3"')
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
