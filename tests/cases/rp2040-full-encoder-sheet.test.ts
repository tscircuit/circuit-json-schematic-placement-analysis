import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

// The same connector/filter arrangement as the Hall sheet, with A/B/Z channels.
// Keep the actual full sheet: the outer A/Z routes and labeled B route differ.
test("records no trace or orientation suggestions for the full encoder sheet's connector detours", () => {
  const circuitJson = getRp2040BldcSheet("encoder")
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(10)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    Object.fromEntries(
      Object.entries(analysis.getIssueCounts()).filter(
        ([, count]) => count > 0,
      ),
    ),
  ).toEqual({
    PinHeaderSchematicBoxTooWide: 1,
  })
  const input = {
    circuitJson,
    analysis,
    cropToIssues: false,
    width: 1800,
    height: 1200,
  }
  expect(
    analysis.getIssues({
      issueTypes: [
        "TraceCanBeSimplifiedByMovingComponent",
        "TwoPinComponentCouldBeFlipped",
      ],
    }),
  ).toEqual([])
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
