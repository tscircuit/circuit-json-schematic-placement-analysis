import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createPocketAudioDac } from "../assets/pocket-audio-dac"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("moving only the two DAC filter capacitors clears the findings and preserves every source connection", async () => {
  const before = await createPocketAudioDac()
  const after = await createPocketAudioDac(true)
  expectReproRendered(after, 12)
  const sourceTypes = [
    "source_component",
    "source_port",
    "source_net",
    "source_trace",
    "source_group",
    "source_component_internal_connection",
  ]
  expect(after.filter((e) => sourceTypes.includes(e.type))).toEqual(
    before.filter((e) => sourceTypes.includes(e.type)),
  )
  const moved: Record<string, { x: number; y: number }> = {
    C_FILTER_L: { x: -14.3, y: -16.3 },
    C_FILTER_R: { x: -10.8, y: -16.3 },
  }
  for (const component of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(before, component.name!)
    expect(getReproSchematicComponent(after, component.name!)).toEqual(
      moved[component.name!]
        ? { ...original, center: moved[component.name!]! }
        : original,
    )
  }
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssueCounts().SeriesRcFilterComponentsNotGrouped).toBe(0)
  expect(analysis.getIssues()).toEqual(
    analyzeSchematicPlacement(before)
      .getIssues()
      .filter((i) => i.lineItemType !== "SeriesRcFilterComponentsNotGrouped"),
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1500,
      height: 1500,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
