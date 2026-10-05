import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("real RP2040 Hall sheet has two long visible connector-to-ground support paths", () => {
  const circuitJson = getRp2040BldcSheet("hall")
  const before = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const issues = analysis.getIssues()
  expect(issues).toHaveLength(2)
  expect(
    issues.every(
      (i) =>
        i.lineItemType === "RailPathTooSpreadOut" &&
        i.hostSchematicBox.sourceComponentName === "J_HALL" &&
        i.pathSpan > 19 &&
        i.railType === "ground",
    ),
  ).toBe(true)
  expect(JSON.stringify(circuitJson)).toBe(before)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["RailPathTooSpreadOut"],
      width: 1400,
      height: 900,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
