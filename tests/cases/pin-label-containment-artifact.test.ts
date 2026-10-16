import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { parseSync } from "svgson"
import { createReadingLampPinLabelBoundsCircuitJson } from "../assets/reading-lamp-pin-label-bounds"

test("exposes the containment rule through filters, counts, XML, and viewer issue artifacts", async () => {
  const circuitJson = await createReadingLampPinLabelBoundsCircuitJson()
  const all = analyzeSchematicPlacement(circuitJson)
  const issueTypes = ["SchematicBoxInnerLabelOutOfBounds"] as const
  expect(
    analyzeSchematicPlacement(circuitJson, { issueTypes }).getIssues(),
  ).toEqual(all.getIssues({ issueTypes }))
  expect(
    analyzeSchematicPlacement(circuitJson, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(
    analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SchematicBoxInnerLabelCollision"],
    }).getIssues(),
  ).toEqual([])
  expect(all.getIssueCounts().SchematicBoxInnerLabelOutOfBounds).toBe(1)
  const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, {
    issueTypes,
    width: 900,
    height: 450,
  })
  expect(artifacts).toHaveLength(1)
  const artifact = artifacts[0]!
  expect(artifact.descriptionXml).toContain('suggestedSchHeight="2.55"')
  expect(artifact.descriptionXml).toContain('outsideEdges="top"')
  expect(artifact.descriptionXml).toContain('outsideEdges="bottom"')
  const highlightedLabels: string[] = []
  const visit = (node: ReturnType<typeof parseSync>) => {
    if (node.attributes["data-highlight-label"])
      highlightedLabels.push(node.attributes["data-highlight-label"])
    for (const child of node.children) visit(child)
  }
  visit(parseSync(artifact.content))
  expect(highlightedLabels.sort()).toEqual(["GND1", "GND2", "VCCA", "VCCB2"])
  expect(artifact.content).toMatchSvgSnapshot(import.meta.path)
})
