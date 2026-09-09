import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicTextCollisionCircuitJson } from "../assets/schematic-text-collisions"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

beforeAll(async () => {
  const circuitJson = await createSchematicTextCollisionCircuitJson("text")
  expectReproRendered(circuitJson, 2)
  expectReproNets(circuitJson, [["U1.OUT", "U2.IN"]])
  const texts = circuitJson
    .filter((element) => element.type === "schematic_text")
    .filter((text) => !text.schematic_component_id)
  expect(texts).toHaveLength(2)
  expect(texts[0]!.text).not.toBe(texts[1]!.text)
  expect(texts[0]!.position).toEqual(texts[1]!.position)
  expect(texts.every((text) => text.font_size === 0.6)).toBe(true)
  expect(texts[0]!.position.y).toBeGreaterThan(1)

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

test("reports two independent schematic annotations overlapping each other", () => {
  expect(issueTypes).toContain("SchematicTextCollision")
})
