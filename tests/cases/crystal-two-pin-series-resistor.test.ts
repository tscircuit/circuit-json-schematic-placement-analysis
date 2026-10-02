import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createRp2040CrystalNetwork,
  moveCrystal,
} from "../fixtures/rp2040-crystal-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reports a two-pin crystal through a series resistor", () => {
  const circuitJson = createRp2040CrystalNetwork()
  for (let i = circuitJson.length - 1; i >= 0; i--) {
    const e = circuitJson[i]!
    if (
      e.type === "source_port" &&
      ["source_port_111", "source_port_112"].includes(e.source_port_id)
    )
      circuitJson.splice(i, 1)
  }
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["CrystalNotCenteredOverLoadCapacitors"],
  })
  expect(issues).toHaveLength(1)

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
