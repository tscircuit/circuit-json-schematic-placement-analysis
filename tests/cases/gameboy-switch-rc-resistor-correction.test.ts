import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createGameboySwitchCapacitorRepro } from "../assets/gameboy-switch-capacitors"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reports R26 left far from an otherwise grouped switch/capacitor pair", async () => {
  const before = await createGameboySwitchCapacitorRepro("resistor-separated")
  const after = await createGameboySwitchCapacitorRepro("grouped")
  expectReproRendered(before, 30)
  expectReproRendered(after, 30)
  expect(before.filter((e) => e.type.startsWith("source_"))).toEqual(
    after.filter((e) => e.type.startsWith("source_")),
  )
  for (const part of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(before, part.name!)
    const corrected = getReproSchematicComponent(after, part.name!)
    expect(corrected).toEqual(
      part.name === "R26"
        ? { ...original, center: { x: -9.8, y: 13.6 } }
        : original,
    )
  }
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues()).toEqual([])
  expect(baseline.getIssues()).toHaveLength(1)
  const issue = baseline.getIssues()[0]!
  if (issue.lineItemType !== "SwitchRcNetworkNotGrouped")
    throw new Error("Expected RC network finding")
  expect(issue.resistorSchematicBox?.sourceComponentName).toBe("R26")
  expect(issue.switchCapacitorBodyGap).toBeLessThanOrEqual(
    issue.maxRecommendedSwitchCapacitorBodyGap,
  )
  expect(issue.resistorBodyGap!).toBeGreaterThan(
    issue.maxRecommendedResistorBodyGap!,
  )
  expect(issue.message).toContain("R26 is too far")
})
