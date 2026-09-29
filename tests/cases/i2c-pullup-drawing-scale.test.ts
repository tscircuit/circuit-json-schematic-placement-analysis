import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { I2cPullupPairPlacementSolver } from "lib/solvers/I2cPullupPairPlacementSolver/I2cPullupPairPlacementSolver"
import type { SchematicPlacementIssue } from "lib/types"
import { buildSolverContext } from "lib/utils/placements"
import { watchyI2cPullups } from "../assets/watchy-i2c-pullups"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("uniform drawing scale and translation do not change the I2C grouping result", () => {
  for (const scale of [0.1, 1, 10]) {
    const ctx = buildSolverContext(watchyI2cPullups)
    ctx.componentPlacements = ctx.componentPlacements.map((placement) => ({
      ...placement,
      schX: placement.schX * scale + 100,
      schY: placement.schY * scale - 100,
      width: placement.width * scale,
      height: placement.height * scale,
    }))
    const issues: SchematicPlacementIssue[] = []
    new I2cPullupPairPlacementSolver({ ctx, issues }).solve()
    expect(issues).toHaveLength(1)
    const issue = issues[0]!
    if (issue.lineItemType !== "I2cPullupPairNotGrouped")
      throw new Error("Unexpected issue")
    expect(issue.bodyGap).toBeGreaterThan(issue.maxHostBodyGap)
  }
  expect(
    createIssueReproSnapshot({
      circuitJson: watchyI2cPullups,
      analysis: analyzeSchematicPlacement(watchyI2cPullups),
      schematicSheetId: "schematic_sheet_3",
      issueTypes: ["I2cPullupPairNotGrouped"],
      width: 1000,
      height: 750,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
