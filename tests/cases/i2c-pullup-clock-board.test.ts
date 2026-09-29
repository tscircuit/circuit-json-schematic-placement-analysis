import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import published from "../assets/clock-board.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { expectReproNets } from "../fixtures/placement-repro-assertions"

test("clock board pull-ups on the same side of the RTC do not warn", () => {
  const circuitJson = published as CircuitJson
  expectReproNets(circuitJson, [
    ["R_SDA.pin2", "net.I2C_SDA"],
    ["R_SCL.pin2", "net.I2C_SCL"],
    ["R_SDA.pin1", "R_SCL.pin1", "net.V5"],
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({ issueTypes: ["I2cPullupPairNotGrouped"] }),
  ).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_2",
      issueTypes: ["I2cPullupPairNotGrouped"],
      width: 1000,
      height: 750,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
