import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reports a pull-up below and a pull-down above their signal pins", async () => {
  const circuitJson = await createPullResistorsWrongSideCircuitJson()
  expectReproRendered(circuitJson, 3)
  expectReproNets(circuitJson, [
    ["R1.pin1", "net.VCC"],
    ["R1.pin2", "U1.RESET_N"],
    ["R2.pin1", "U1.BOOT"],
    ["R2.pin2", "net.GND"],
  ])

  expect(
    getReproSourcePort(circuitJson, "U1", "RESET_N").needs_external_pullup,
  ).toBe(true)
  expect(
    getReproSourcePort(circuitJson, "U1", "BOOT").needs_external_pulldown,
  ).toBe(true)
  const chip = getReproSchematicComponent(circuitJson, "U1")
  expect(getReproSchematicComponent(circuitJson, "R1").center.y).toBeLessThan(
    chip.center.y - 2,
  )
  expect(
    getReproSchematicComponent(circuitJson, "R2").center.y,
  ).toBeGreaterThan(chip.center.y + 2)

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
  const issues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
  const matching = issues.filter(
    (issue) => issue.lineItemType === "PullResistorOnWrongSide",
  )
  expect(
    matching.map((issue) => [
      issue.resistorSchematicBox.sourceComponentName,
      issue.pullDirection,
      issue.preferredSide,
    ]),
  ).toEqual([
    ["R1", "up", "above"],
    ["R2", "down", "below"],
  ])
  expect(matching.map((issue) => issue.signalSchY)).toEqual([0.1, -0.1])
  expect(analysis.toString()).toContain("<PullResistorOnWrongSide")
})
