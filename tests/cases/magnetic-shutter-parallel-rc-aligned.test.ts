import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createMagneticShutterPower } from "../assets/magnetic-shutter-parallel-rc"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("moving only C9 beside R3 clears the parallel RC finding without changing connectivity", async () => {
  const before = await createMagneticShutterPower()
  const after = await createMagneticShutterPower(true)
  expectReproRendered(after, 14)
  expect(
    after.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
        "source_component_internal_connection",
      ].includes(e.type),
    ),
  ).toEqual(
    before.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
        "source_component_internal_connection",
      ].includes(e.type),
    ),
  )
  const ports = before.filter((e) => e.type === "source_port")
  const a = getSourceConnectivity(before),
    b = getSourceConnectivity(after)
  for (const p of ports)
    for (const q of ports)
      expect(a(p.source_port_id) === a(q.source_port_id)).toBe(
        b(p.source_port_id) === b(q.source_port_id),
      )
  for (const component of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(before, component.name!)
    const moved = getReproSchematicComponent(after, component.name!)
    expect(moved).toEqual(
      component.name === "C9"
        ? { ...original, center: { x: 0, y: 1 } }
        : original,
    )
  }
  const analysis = analyzeSchematicPlacement(after)
  expect(analysis.getIssues()).toEqual(
    analyzeSchematicPlacement(before)
      .getIssues()
      .filter((i) => i.lineItemType !== "ParallelRcNotAligned"),
  )
  expect(analysis.getIssues({ issueTypes: ["ParallelRcNotAligned"] })).toEqual(
    [],
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1600,
      height: 1200,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
