import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createWireTextCollisionCircuitJson } from "../assets/wire-text-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createWireTextCollisionCircuitJson()
  expectReproRendered(circuitJson, 2)
  expectReproNets(circuitJson, [["U1.OUT", "U2.IN"]])

  const text = circuitJson.find(
    (element) =>
      element.type === "schematic_text" && element.text === "ANALOG INPUT",
  )
  if (text?.type !== "schematic_text") throw new Error("Missing collision text")
  expect(text.font_size).toBe(0.6)
  // The rendered snapshot confirms that this horizontal wire crosses the glyphs.
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
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
  issueTypes = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues"
        ? item.issues.map((issue) => issue.lineItemType)
        : [],
    )
})

test.failing("reports a routed wire crossing large schematic text", () => {
  expect(issueTypes).toContain("WireTextCollision")
})
