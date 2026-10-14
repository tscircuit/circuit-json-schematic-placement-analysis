import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createGameboySwitchCapacitorRepro } from "../assets/gameboy-switch-capacitors"

test("rotating the ten capacitors clears existing findings but leaves all ten grouping findings", async () => {
  const json = await createGameboySwitchCapacitorRepro("orientation-only")
  const analysis = analyzeSchematicPlacement(json)
  const issues = analysis.getIssues()
  expect(issues).toHaveLength(10)
  expect(
    issues.every(
      (issue) => issue.lineItemType === "CapacitorSeparatedFromSwitch",
    ),
  ).toBe(true)
  expect(analysis.getIssueCounts().TwoPinComponentShouldBeVertical).toBe(0)
})
