import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema14ParallelResistorRepro } from "../assets/nema14-parallel-resistors"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete NEMA14 USB-PD sheet with inline parallel resistors", async () => {
  const circuitJson = await createNema14ParallelResistorRepro()
  expectReproRendered(circuitJson, 23)
  expect(getReproSchematicComponent(circuitJson, "R_PD_DISCH1").center).toEqual(
    { x: -7.5, y: -5.5 },
  )
  expect(getReproSchematicComponent(circuitJson, "R_PD_DISCH2").center).toEqual(
    { x: -7.5, y: -7 },
  )
  expectReproNets(circuitJson, [
    ["net.VM", "R_PD_DISCH1.pin1", "R_PD_DISCH2.pin1"],
    ["net.PD_DISCH", "U3.DISCH", "R_PD_DISCH1.pin2", "R_PD_DISCH2.pin2"],
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "TwoPinComponentShouldBeVertical",
    "ResistorSeparatedFromChipPin",
  ])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 2400,
      height: 1700,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
