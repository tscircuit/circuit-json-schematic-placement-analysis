import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createQrngDualAmplifier } from "../assets/qrng-dual-amplifier"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("orienting both QRNG transistor stages toward their rails preserves every source connection", async () => {
  const before = await createQrngDualAmplifier()
  const after = await createQrngDualAmplifier(true)
  expectReproRendered(after, 18)
  const source = (c: typeof before) =>
    c
      .filter((e) =>
        [
          "source_component",
          "source_port",
          "source_net",
          "source_trace",
          "source_group",
          "source_component_internal_connection",
        ].includes(e.type),
      )
      .map((e) => {
        // Symbol rotation can add display aliases; port IDs, pin numbers, flags,
        // traces and connectivity keys must remain identical.
        if (e.type !== "source_port") return e
        const { port_hints, ...electricalPort } = e
        return electricalPort
      })
  expect(source(after)).toEqual(source(before))
  const analysis = analyzeSchematicPlacement(after)
  expect(
    analysis.getIssues({
      issueTypes: ["TransistorHasIncorrectRailOrientation"],
    }),
  ).toEqual([])
  const counts = analysis.getIssueCounts()
  expect(counts.ComponentOverlap).toBe(0)
  expect(counts.SchematicTextCollision).toBe(0)
  expect(counts.NetLabelCollision).toBe(0)
  expect(counts.ComponentNetLabelCollision).toBe(0)
  expect(counts.ComponentBoxNetLabelCollision).toBe(0)
  expect(counts.TraceCanBeSimplifiedByMovingComponent).toBe(0)
  const beforeCounts = analyzeSchematicPlacement(before).getIssueCounts()
  for (const [type, count] of Object.entries(counts))
    expect(count).toBeLessThanOrEqual(
      beforeCounts[type as keyof typeof beforeCounts],
    )
  const changed = after.filter(
    (e) =>
      e.type === "schematic_component" &&
      JSON.stringify(e) !==
        JSON.stringify(
          before.find(
            (b) =>
              b.type === "schematic_component" &&
              b.schematic_component_id === e.schematic_component_id,
          ),
        ),
  )
  expect(
    changed
      .map(
        (e) =>
          e.type === "schematic_component" &&
          after.find(
            (c) =>
              c.type === "source_component" &&
              c.source_component_id === e.source_component_id,
          ),
      )
      .map((c) => c && c.type === "source_component" && c.name)
      .sort(),
  ).toEqual(["C1", "C2", "Q1", "Q2", "R1B", "R1C", "R1E", "R2B", "R2C", "R2E"])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: after,
      analysis,
      width: 1500,
      height: 1500,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
