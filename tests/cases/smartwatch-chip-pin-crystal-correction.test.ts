import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSmartwatchMotionRtcRepro } from "../assets/smartwatch-motion-rtc"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("moving and rotating only Y1 places it beside U4 without changing connectivity", async () => {
  const before = await createSmartwatchMotionRtcRepro()
  const after = await createSmartwatchMotionRtcRepro(true)
  expectReproRendered(after, 7)
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  expectReproNets(after, [
    ["Y1.pin1", "U4.pin1", "net.RTC_OSCI"],
    ["Y1.pin2", "U4.pin2", "net.RTC_OSCO"],
  ])
  const crystal = getReproSchematicComponent(before, "Y1")
  const otherComponents = (json: typeof before) =>
    json.filter(
      (e) =>
        e.type === "schematic_component" &&
        e.source_component_id !== crystal.source_component_id,
    )
  expect(otherComponents(after)).toEqual(otherComponents(before))
  expect(getReproSchematicComponent(after, "Y1")).toMatchObject({
    center: { x: 3, y: 3.1 },
    symbol_name: "crystal_down",
  })
  const issueTypes = ["CrystalSeparatedFromChipPins"] as const
  const analysis = analyzeSchematicPlacement(after)
  const originalAnalysis = analyzeSchematicPlacement(before)
  expect(originalAnalysis.getIssues({ issueTypes })).toMatchObject([
    {
      hostSchematicBox: { sourceComponentName: "U4" },
      crystalSchematicBox: { sourceComponentName: "Y1" },
    },
  ])
  expect(analysis.getIssues({ issueTypes })).toEqual([])
  expect(analysis.getIssues()).toEqual(
    originalAnalysis
      .getIssues()
      .filter((issue) => issue.lineItemType !== "CrystalSeparatedFromChipPins"),
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1600,
      height: 1000,
      highlightIssues: ["CrystalSeparatedFromChipPins"],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
