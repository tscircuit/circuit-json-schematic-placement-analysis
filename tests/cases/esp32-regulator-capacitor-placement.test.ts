import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { esp32UsbDucky as circuitJson } from "../assets/esp32-usb-ducky"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("highlights reversed regulator capacitor pairs on the complete esp32 sheet", () => {
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
  ).toEqual(["U2"])
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    issueTypes: ["RegulatorCapacitorsOnWrongSides"],
    showFullSchematic: true,
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 1800,
    height: 1200,
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
