import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createRp2040CrystalNetwork,
  moveCrystal,
} from "../fixtures/rp2040-crystal-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reports the real RP2040 four-pin crystal through its series resistor", () => {
  const circuitJson = createRp2040CrystalNetwork()

  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
  })
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    newSchX: -7.12,
    newSchY: -5,
    deltaSchX: 0.78,
    deltaSchY: 0,
  })
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
