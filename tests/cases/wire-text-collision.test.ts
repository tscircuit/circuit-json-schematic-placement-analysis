import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createWireTextCollisionCircuitJson } from "../assets/wire-text-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

const issueTypesByVariant: string[][] = []

// Rendering and geometry failures must not be swallowed by test.failing.
beforeAll(async () => {
  for (const [annotation, snapshotName] of [
    ["ANALOG INPUT", undefined],
    ["DIGITAL STATUS", "alternate-text"],
  ] as const) {
    const circuitJson = await createWireTextCollisionCircuitJson(annotation)
    expectReproRendered(circuitJson, 2)
    expectReproNets(circuitJson, [["U1.OUT", "U2.IN"]])

    const texts = circuitJson
      .filter((element) => element.type === "schematic_text")
      .filter((text) => !text.schematic_component_id)
    expect(texts).toHaveLength(1)
    const text = texts[0]!
    expect(text.font_size).toBe(0.6)
    // The rendered snapshots confirm that this horizontal wire crosses the glyphs.
    const edges = circuitJson.flatMap((element) =>
      element.type === "schematic_trace" ? element.edges : [],
    )
    expect(
      edges.some(
        (edge) =>
          Math.abs(edge.from.y) < 0.01 &&
          Math.abs(edge.to.y) < 0.01 &&
          Math.min(edge.from.x, edge.to.x) < text.position.x - 1 &&
          Math.max(edge.from.x, edge.to.x) > text.position.x + 1,
      ),
    ).toBe(true)
    expect(Math.abs(text.position.y)).toBeLessThan(text.font_size / 2)

    const analysis = analyzeSchematicPlacement(circuitJson)
    await expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(import.meta.path, snapshotName)
    issueTypesByVariant.push(
      analysis
        .getLineItems()
        .flatMap((item) =>
          item.lineItemType === "SchematicPlacementIssues"
            ? item.issues.map((issue) => issue.lineItemType)
            : [],
        ),
    )
  }
})

test.failing("reports text/trace collisions independently of the annotation wording", () => {
  expect(
    issueTypesByVariant.map((types) =>
      types.includes("SchematicTextCollision"),
    ),
  ).toEqual([true, true])
})
