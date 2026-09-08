import { expect, test } from "bun:test"
import { createSchematicPlacementIssueArtifacts } from "lib/index"
import { createSchematicTextCollisionCircuitJson } from "../assets/schematic-text-collisions"

test("renders newly merged text collisions at their text and obstacle bounds", async () => {
  const circuitJson = await createSchematicTextCollisionCircuitJson("component")
  const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, {
    issueTypes: ["SchematicTextCollision"],
  })
  expect(artifacts.length).toBeGreaterThan(0)
  const artifact = artifacts[0]!
  if (artifact.issue.lineItemType !== "SchematicTextCollision")
    throw new Error("Expected text collision")
  for (const bounds of [
    artifact.issue.textBounds,
    artifact.issue.collidingObjectBounds,
  ]) {
    expect(artifact.content).toContain(
      `<rect x="${bounds.left}" y="${bounds.bottom}" width="${bounds.right - bounds.left}" height="${bounds.top - bounds.bottom}" fill="#ef444433"`,
    )
  }
  expect(artifact.content.match(/data-issue-index=/g)).toHaveLength(1)
  expect(artifact.content).toMatchSvgSnapshot(import.meta.path)
})
