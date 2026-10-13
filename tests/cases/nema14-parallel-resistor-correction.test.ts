import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema14ParallelResistorRepro } from "../assets/nema14-parallel-resistors"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("moving only the second discharge resistor exposes the two parallel branches", async () => {
  const before = await createNema14ParallelResistorRepro()
  const after = await createNema14ParallelResistorRepro(true)
  expectReproRendered(after, 23)
  // Preserve every source record, including pins, net membership and trace endpoints.
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  expectReproNets(after, [
    ["net.VM", "R_PD_DISCH1.pin1", "R_PD_DISCH2.pin1"],
    ["net.PD_DISCH", "U3.DISCH", "R_PD_DISCH1.pin2", "R_PD_DISCH2.pin2"],
  ])
  const placements = before.filter((e) => e.type === "schematic_component")
  const changed = after
    .filter((e) => e.type === "schematic_component")
    .filter((e, i) => JSON.stringify(e) !== JSON.stringify(placements[i]))
  expect(changed).toHaveLength(1)
  const resistor = before
    .filter((e) => e.type === "source_component")
    .find((e) => e.name === "R_PD_DISCH2")!
  expect(changed[0]).toMatchObject({
    source_component_id: resistor.source_component_id,
    center: { x: -5.5, y: -5.5 },
  })
  const original = placements.find(
    (e) => e.source_component_id === resistor.source_component_id,
  )!
  expect(changed[0]).toEqual({ ...original, center: { x: -5.5, y: -5.5 } })
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "TwoPinComponentShouldBeVertical",
    "ResistorSeparatedFromChipPin",
  ])
  expect(
    analyzeSchematicPlacement(before).getIssues({
      issueTypes: ["ParallelResistorsDrawnInline"],
    }),
  ).toHaveLength(1)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 2400,
      height: 1700,
      highlightIssues: ["ParallelResistorsDrawnInline"],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
