import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("rail visibility thresholds can suppress or isolate length findings", () => {
  const circuitJson = createRailPathRepro()
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
    railPathVisibility: { maxSpan: 20, maxPathLength: 30 },
  })
  expect(analysis.getIssues()).toEqual([])
  expect(
    analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["RailPathTooSpreadOut"],
      railPathVisibility: { maxSpan: 20, maxPathLength: 16 },
    }).getIssues(),
  ).toHaveLength(1)
  expect(() =>
    analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["RailPathTooSpreadOut"],
      railPathVisibility: { maxSpan: -1 },
    }),
  ).toThrow()
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1100,
      height: 750,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
