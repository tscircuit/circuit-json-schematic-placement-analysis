import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import clockBoardJson from "../assets/clock-board.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("preserves the clock board horizontal series power diode", () => {
  const circuitJson = clockBoardJson as CircuitJson
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 80)
  expectReproNets(circuitJson, [
    ["net.VBAT_SWITCHED", "D_REVERSE.pin1"],
    ["D_REVERSE.pin2", "net.VBAT_SW"],
  ])
  for (const name of ["VBAT_SWITCHED", "VBAT_SW"]) {
    expect(
      circuitJson.find(
        (element) => element.type === "source_net" && element.name === name,
      ),
    ).toMatchObject({ is_power: true, is_positive_voltage_source: true })
  }

  const analysis = analyzeSchematicPlacement(circuitJson)
  const powerSheetOrientationIssues = analysis.getIssues({
    issueTypes: ["TwoPinComponentShouldBeVertical"],
    schematicSheetId: "schematic_sheet_0",
  })
  expect(
    powerSheetOrientationIssues.map((issue) =>
      issue.lineItemType === "TwoPinComponentShouldBeVertical"
        ? issue.schematicBox.sourceComponentName
        : null,
    ),
  ).toEqual(["C_BUCK_IN", "C_BUCK_OUT1", "C_BUCK_OUT2"])
  expect(
    powerSheetOrientationIssues.some(
      (issue) =>
        issue.lineItemType === "TwoPinComponentShouldBeVertical" &&
        issue.schematicBox.sourceComponentName === "D_REVERSE",
    ),
  ).toBe(false)
  const source = circuitJson.find(
    (element) =>
      element.type === "source_component" && element.name === "D_REVERSE",
  )
  expect(source).toMatchObject({
    ftype: "simple_diode",
    name: "D_REVERSE",
  })

  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["TwoPinComponentShouldBeVertical"],
      schematicSheetId: "schematic_sheet_0",
      showOverlay: true,
      showFullSchematic: true,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
