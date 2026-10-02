import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createRp2040CrystalNetwork,
  moveCrystal,
} from "../fixtures/rp2040-crystal-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("accepts a centered four-pin crystal with clearance above the load capacitors", () => {
  const circuitJson = createRp2040CrystalNetwork()
  moveCrystal(circuitJson, -7.125, -5)
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
  })
  expect(issues).toHaveLength(0)

  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
      showOverlay: true,
      width: 1200,
      height: 700,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
