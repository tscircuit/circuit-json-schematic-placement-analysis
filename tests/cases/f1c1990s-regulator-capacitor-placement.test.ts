import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { f1c1990sDevBoard as circuitJson } from "../assets/f1c1990s-dev-board"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("highlights reversed regulator capacitor pairs on the complete f1c1990s sheet", () => {
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["RegulatorCapacitorsOnWrongSides"],
  })
  expect(
    issues.map(
      (issue) =>
        issue.lineItemType === "RegulatorCapacitorsOnWrongSides" &&
        issue.regulatorSchematicBox.sourceComponentName,
    ),
  ).toEqual(["U_1V8", "U_1V2"])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes: ["RegulatorCapacitorsOnWrongSides"],
    showFullSchematic: true,
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 2200,
    height: 1600,
  })
  const numbers = issues.map((issue) => analysis.getIssues().indexOf(issue) + 1)
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)]
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b),
  ).toEqual(numbers.flatMap((number) => [number, number, number]))
  expect(
    [...svg.matchAll(/data-listing-issue-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    ),
  ).toEqual(numbers)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
