import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPa25MotorControllerPower } from "../assets/pa25-motor-controller-power"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// D2 and R2 are parallel between VM and REVERSE_GATE in the published source.
// Their vertical pin spans are disjoint: the schematic hides their parallelism.
test("reproduces the missed parallel D2/R2 layout on the published PA25 Power sheet", async () => {
  const circuitJson = await createPa25MotorControllerPower()
  expectReproRendered(circuitJson, 14)
  expectReproNets(circuitJson, [
    ["D2.anode", "R2.pin1", "R1.pin1"],
    ["D2.cathode", "R2.pin2", "C1.pin1"],
  ])
  expect(getReproSchematicComponent(circuitJson, "D2").center).toEqual({
    x: 1.3,
    y: 5.2,
  })
  expect(getReproSchematicComponent(circuitJson, "R2").center).toEqual({
    x: -1.95,
    y: 2.6,
  })
  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  // Baseline: the analyser misses this pair. The fix PR changes this assertion.
  expect(
    analysis
      .getIssues()
      .filter(
        (issue) =>
          "diodeSchematicBox" in issue &&
          "resistorSchematicBox" in issue &&
          issue.diodeSchematicBox.sourceComponentName === "D2" &&
          issue.resistorSchematicBox.sourceComponentName === "R2",
      ),
  ).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_0",
      showFullSchematic: true,
      showOverlay: true,
      showListingIssueMarkers: true,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
