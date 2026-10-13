import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSmartwatchMotionRtcRepro } from "../assets/smartwatch-motion-rtc"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete Smartwatch Motion & RTC sheet with its crystal opposite the chip pins", async () => {
  const circuitJson = await createSmartwatchMotionRtcRepro()
  expectReproRendered(circuitJson, 7)
  expect(getReproSchematicComponent(circuitJson, "Y1").center).toEqual({
    x: 10.5,
    y: 3,
  })
  expect(getReproSchematicComponent(circuitJson, "U4").center).toEqual({
    x: 7,
    y: 3,
  })
  expectReproNets(circuitJson, [
    ["Y1.pin1", "U4.pin1", "net.RTC_OSCI"],
    ["Y1.pin2", "U4.pin2", "net.RTC_OSCO"],
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((issue) => issue.lineItemType)).toEqual([
    "SchematicBoxInnerLabelCollision",
    "TwoPinComponentShouldBeVertical",
    "TwoPinComponentShouldBeVertical",
    "TwoPinComponentShouldBeVertical",
    "TwoPinComponentShouldBeVertical",
    "DecouplingCapacitorsNotCloseTogether",
    "CrystalSeparatedFromChipPins",
  ])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1600,
      height: 1000,
      highlightIssues: ["CrystalSeparatedFromChipPins"],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
