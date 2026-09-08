import { expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "./create-schematic-analysis-fixture-svg"

export function inspectNetworkFixture(
  circuitJson: CircuitJson,
  testPath: string,
  variant?: string,
) {
  const before = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(JSON.stringify(circuitJson)).toBe(before)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(testPath, variant)
  const issues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
  return {
    analysis,
    feedback: issues.filter(
      (issue) => issue.lineItemType === "FeedbackNetworkNotCompact",
    ),
    pulls: issues.filter(
      (issue) => issue.lineItemType === "PullResistorOnWrongSide",
    ),
  }
}
