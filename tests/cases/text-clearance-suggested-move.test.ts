import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createWireTextCollisionCircuitJson } from "../assets/wire-text-collision"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("moving the reported text anchor clears the collision without altering wires or connectivity", async () => {
  const circuitJson = await createWireTextCollisionCircuitJson("STATUS <A&B>")
  const original = JSON.stringify(
    circuitJson.filter((e) => e.type !== "schematic_text"),
  )
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = getPlacementIssues(analysis).filter(
    (e) => e.lineItemType === "SchematicTextCollision",
  )
  expect(issues).toHaveLength(1)
  const issue = issues[0]!
  expect(analysis.toString()).toContain("STATUS &lt;A&amp;B&gt;")
  expect(issue.suggestedMove).toBeDefined()
  const text = circuitJson.find(
    (e) =>
      e.type === "schematic_text" &&
      e.schematic_text_id === issue.schematicTextId,
  )
  if (text?.type !== "schematic_text") throw new Error("Missing text")
  text.position = {
    x: issue.suggestedMove!.newSchX,
    y: issue.suggestedMove!.newSchY,
  }
  const fixed = analyzeSchematicPlacement(circuitJson)
  expect(
    getPlacementIssues(fixed).filter(
      (e) => e.lineItemType === "SchematicTextCollision",
    ),
  ).toEqual([])
  expect(
    JSON.stringify(circuitJson.filter((e) => e.type !== "schematic_text")),
  ).toBe(original)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis: fixed }),
  ).toMatchSvgSnapshot(import.meta.path)
})
