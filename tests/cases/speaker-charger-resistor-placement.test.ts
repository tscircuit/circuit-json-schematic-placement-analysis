import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSpeakerChargerResistorRepro } from "../assets/speaker-charger-resistor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("moving only R17 beside U6 preserves the full charger circuit and draws its branch directly", async () => {
  const before = await createSpeakerChargerResistorRepro()
  const after = await createSpeakerChargerResistorRepro(true)
  expectReproRendered(after, 9)
  expectReproNets(after, [
    ["U6.PROG", "R17.pin2"],
    ["U6.GND", "U6.EP", "R17.pin1"],
  ])
  // Renderer warning messages contain runtime instance IDs; electrical records do not.
  const electrical = (json: typeof before) =>
    json.filter(
      (e) =>
        e.type.startsWith("source_") &&
        e.type !== "source_unnamed_trace_warning",
    )
  expect(electrical(after)).toEqual(electrical(before))
  for (const e of before) {
    if (e.type !== "source_component" || e.name === "R17") continue
    expect(getReproSchematicComponent(after, e.name)).toEqual(
      getReproSchematicComponent(before, e.name),
    )
  }
  const analysis = analyzeSchematicPlacement(after)
  expect(
    analysis.getIssues({ issueTypes: ["ResistorSeparatedFromChipPin"] }),
  ).toEqual([])
  expect(analysis.getIssues()).toEqual(
    analyzeSchematicPlacement(before)
      .getIssues()
      .filter((i) => i.lineItemType !== "ResistorSeparatedFromChipPin"),
  )
  const pins = [
    getReproSourcePort(after, "U6", "PROG"),
    getReproSourcePort(after, "R17", "pin2"),
  ].map((p) =>
    after.find(
      (e) =>
        e.type === "schematic_port" && e.source_port_id === p.source_port_id,
    ),
  )
  expect(
    after.some(
      (e) =>
        e.type === "schematic_trace" &&
        pins.every(
          (p) =>
            p?.type === "schematic_port" &&
            e.edges.some((edge) =>
              [edge.from, edge.to].some(
                (point) =>
                  Math.hypot(point.x - p.center.x, point.y - p.center.y) <
                  0.001,
              ),
            ),
        ),
    ),
  ).toBe(true)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1800,
      height: 1200,
      highlightIssues: ["ResistorSeparatedFromChipPin"],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "corrected-full-sheet")
})
