import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createBldcPhaseVGroupingBoxCircuitJson } from "../assets/bldc-phase-v"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces false component overlaps inside the BLDC Phase V grouping box", async () => {
  const circuitJson = await createBldcPhaseVGroupingBoxCircuitJson()
  expectReproRendered(circuitJson, 5)
  expectReproNets(circuitJson, [
    ["R94.pin2", "R95.pin1", "net.GHB_GATE"],
    ["R95.pin2", "net.PHASE_V"],
    ["R96.pin2", "R97.pin1", "net.GLB_GATE"],
    ["R97.pin2", "net.LS_RETURN"],
    ["C91.pin1", "net.VMOTOR"],
    ["C91.pin2", "net.GND"],
  ])
  expect(getReproSchematicComponent(circuitJson, "R97").center).toEqual({
    x: -2.2,
    y: 0.58,
  })
  const groupingBox = circuitJson.find(
    (element) =>
      element.type === "schematic_box" && !element.schematic_component_id,
  )
  expect(groupingBox).toMatchObject({
    x: -5.9,
    y: -2.05,
    width: 9.8,
    height: 11.5,
  })

  const original = JSON.stringify(circuitJson)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const overlaps = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "ComponentOverlap")
  // Record today's incorrect output; the stacked fix will change this assertion.
  expect(overlaps).toHaveLength(2)
  expect(
    overlaps.map((issue) => issue.firstComponent.sourceComponentName).sort(),
  ).toEqual(["R96", "R97"])
  for (const issue of overlaps) {
    expect(issue.secondComponent.schematicComponentId).toBeUndefined()
  }
  await expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["ComponentOverlap"],
      showFullSchematic: true,
      showOverlay: false,
      showListingIssueMarkers: true,
      width: 1200,
      height: 900,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
