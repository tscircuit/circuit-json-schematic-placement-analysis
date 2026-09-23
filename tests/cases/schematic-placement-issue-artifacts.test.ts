import { expect, test } from "bun:test"
import { createSchematicPlacementIssueArtifacts } from "lib/index"
import { createTraceSimplificationCircuitJson } from "../assets/trace-simplification"

test("exports a standalone cropped SVG per issue with only that issue's XML", async () => {
  const circuitJson = await createTraceSimplificationCircuitJson()
  const original = JSON.stringify(circuitJson)
  expect(createSchematicPlacementIssueArtifacts(circuitJson)).toHaveLength(1)
  const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, {
    issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
  })
  expect(artifacts).toHaveLength(1)
  expect(new Set(artifacts.map((artifact) => artifact.fileName)).size).toBe(1)
  for (const [index, artifact] of artifacts.entries()) {
    expect(artifact.issueIndex).toBe(index)
    expect(artifact.content).toContain('stroke="#16a34a"')
    expect(artifact.contentType).toBe("image/svg+xml")
    expect(artifact.content.match(/data-issue-index=/g)).toHaveLength(1)
    expect(artifact.content).toContain(`data-issue-index="${index}"`)
    expect(artifact.content).toContain(
      "&lt;TraceCanBeSimplifiedByMovingComponent",
    )
    expect(artifact.content).not.toContain("Emitted issue counts")
    expect(artifact.descriptionXml).toContain(
      "<TraceCanBeSimplifiedByMovingComponent",
    )
    expect(artifact.bounds!.right).toBeGreaterThan(artifact.bounds!.left)
    expect(artifact.bounds!.top).toBeGreaterThan(artifact.bounds!.bottom)
    expect(
      artifact.content.indexOf("&lt;TraceCanBeSimplifiedByMovingComponent"),
    ).toBeGreaterThan(
      artifact.content.indexOf('class="placement-issue-overlays"'),
    )
    for (const other of artifacts.filter((other) => other !== artifact)) {
      if (other.issue.lineItemType !== "TraceCanBeSimplifiedByMovingComponent")
        throw new Error("Expected trace issue")
      expect(artifact.descriptionXml).not.toContain(
        other.issue.schematicTraceId,
      )
      expect(artifact.content).not.toContain(
        `data-issue-index="${other.issueIndex}"`,
      )
    }
  }
  expect(createSchematicPlacementIssueArtifacts([])).toEqual([])
  expect(
    createSchematicPlacementIssueArtifacts(circuitJson, { issueIndex: 1 }),
  ).toEqual([])
  expect(
    createSchematicPlacementIssueArtifacts(circuitJson, { issueTypes: [] }),
  ).toEqual([])
  expect(
    createSchematicPlacementIssueArtifacts(circuitJson, {
      schematicSheetId: "missing",
    }),
  ).toEqual([])
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(artifacts[0]!.content).toMatchSvgSnapshot(import.meta.path)
})
