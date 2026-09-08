import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicTextCollisionCircuitJson } from "../assets/schematic-text-collisions"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

beforeAll(async () => {
  const circuitJson = await createSchematicTextCollisionCircuitJson("component")
  expectReproRendered(circuitJson, 2)
  expectReproNets(circuitJson, [["U1.OUT", "U2.IN"]])
  const texts = circuitJson
    .filter((element) => element.type === "schematic_text")
    .filter((text) => !text.schematic_component_id)
  expect(texts).toHaveLength(1)
  const text = texts[0]!
  const component = getReproSchematicComponent(circuitJson, "U1")
  // The free annotation crosses the upper body edge, clear of the wire at y=0.
  expect(Math.abs(text.position.x - component.center.x)).toBeLessThan(
    component.size.width / 2,
  )
  expect(text.position.y - text.font_size / 2).toBeLessThan(
    component.center.y + component.size.height / 2,
  )
  expect(text.position.y - text.font_size / 2).toBeGreaterThan(0.01)
  expect(text.font_size).toBe(0.6)
  expect(component.size.width).toBeGreaterThan(1)
  expect(component.size.height).toBe(0.4)
  const edges = circuitJson.flatMap((element) =>
    element.type === "schematic_trace" ? element.edges : [],
  )
  expect(
    edges.every(
      (edge) => Math.abs(edge.from.y) < 0.01 && Math.abs(edge.to.y) < 0.01,
    ),
  ).toBe(true)

  const analysis = analyzeSchematicPlacement(circuitJson)
  await expect(
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

test.failing("reports free schematic text overlapping an unrelated component body", () => {
  expect(issueTypes).toContain("SchematicTextCollision")
})
