import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createEreaderDisplay } from "../assets/ereader-diode-capacitor-stage"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("a placement-only correction clears the E-Reader junction warning on the complete sheet", async () => {
  const before = await createEreaderDisplay()
  const after = await createEreaderDisplay(true)
  expectReproRendered(after, 26)
  expect(
    after.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_trace",
        "source_net",
      ].includes(e.type),
    ),
  ).toEqual(
    before.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_trace",
        "source_net",
      ].includes(e.type),
    ),
  )
  const moved: string[] = []
  for (const element of after) {
    if (element.type !== "schematic_component") continue
    const original = before.find(
      (e) =>
        e.type === "schematic_component" &&
        e.schematic_component_id === element.schematic_component_id,
    )
    if (JSON.stringify(original) !== JSON.stringify(element)) {
      const source = after.find(
        (e) =>
          e.type === "source_component" &&
          e.source_component_id === element.source_component_id,
      )
      if (source?.type === "source_component") moved.push(source.name!)
    }
  }
  expect(moved.sort()).toEqual(["C16", "C23", "C32", "D2", "D3", "TP4"])
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()
      .DiodeCapacitorJunctionTooSpreadOut,
  ).toBe(1)
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1800,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
