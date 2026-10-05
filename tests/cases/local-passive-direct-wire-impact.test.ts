import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
  type SchematicPlacementIssue,
} from "lib/index"
import { realSchematics } from "../repros/real-schematics"

test("records direct-wire impact on six real examples without changing other diagnostics", () => {
  const issueTypes = ["LocalPassiveConnectionShouldBeDirectWire"] as const
  const observed: number[] = []
  const pairs: string[][] = []
  for (const fixture of realSchematics) {
    const { circuitJson } = fixture
    const original = JSON.stringify(circuitJson)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const additions = analysis.getIssues({ issueTypes })
    observed.push(additions.length)
    const existingTypes = Object.keys(analysis.getIssueCounts()).filter(
      (type) => type !== issueTypes[0],
    ) as SchematicPlacementIssue["lineItemType"][]
    expect(analysis.getIssues({ issueTypes: existingTypes })).toEqual(
      analyzeSchematicPlacement(circuitJson, {
        issueTypes: existingTypes,
      }).getIssues(),
    )
    expect(
      analyzeSchematicPlacement(circuitJson, { issueTypes }).getIssues(),
    ).toEqual(additions)
    for (const issue of additions) {
      if (issue.lineItemType !== issueTypes[0])
        throw new Error("Expected direct-wire suggestion")
      pairs.push([
        issue.firstComponent.sourceComponentName!,
        issue.secondComponent.sourceComponentName!,
      ])
      expect(issue.firstComponent.schematicSheetId).toBe(
        issue.secondComponent.schematicSheetId,
      )
    }
    for (const artifact of createSchematicPlacementIssueArtifacts(circuitJson, {
      analysis,
      issueTypes,
    })) {
      expect(artifact.content).toContain('stroke="#16a34a"')
      expect(artifact.content).toMatchSvgSnapshot(
        import.meta.path,
        `${artifact.schematicSheetId}-${artifact.issueIndex}`,
      )
    }
    expect(JSON.stringify(circuitJson)).toBe(original)
  }
  expect(observed).toEqual([0, 0, 0, 0, 2, 1])
  expect(pairs).toEqual([
    ["U8", "R26"],
    ["U6", "R23"],
    ["U3", "L1"],
  ])
})
