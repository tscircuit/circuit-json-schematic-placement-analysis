import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import clockBoardJson from "../assets/clock-board.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("records the clock board series power diode orientation finding", () => {
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
  const issue = analysis
    .getIssues({ issueTypes: ["TwoPinComponentShouldBeVertical"] })
    .find(
      (issue) =>
        issue.lineItemType === "TwoPinComponentShouldBeVertical" &&
        issue.schematicBox.sourceComponentName === "D_REVERSE",
    )
  expect(issue).toMatchObject({
    lineItemType: "TwoPinComponentShouldBeVertical",
    railPinName: "pin1",
    railType: "power",
    deltaSchRotation: -90,
    suggestedRailFacingDirection: "up",
  })
  if (issue?.lineItemType !== "TwoPinComponentShouldBeVertical") {
    throw new Error("Missing D_REVERSE orientation finding")
  }
  const source = circuitJson.find(
    (element) =>
      element.type === "source_component" &&
      element.source_component_id === issue.schematicBox.sourceComponentId,
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
      issueIndex: analysis.getIssues().indexOf(issue),
      showOverlay: true,
      showFullSchematic: true,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
