import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createRp2040CrystalNetwork,
  moveCrystal,
} from "../fixtures/rp2040-crystal-network"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("skips a four-pin crystal whose case terminals lack ground evidence", () => {
  const circuitJson = createRp2040CrystalNetwork()
  for (const e of circuitJson) if (e.type === "source_net") e.is_ground = false
  const components = circuitJson.filter((e) => e.type === "source_component")
  expect(components).toHaveLength(4)
  expect(components.map((e) => e.ftype).sort()).toEqual([
    "simple_capacitor",
    "simple_capacitor",
    "simple_crystal",
    "simple_resistor",
  ])
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(4)
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
