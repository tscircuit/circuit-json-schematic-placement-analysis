import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createMultiSheetComponentLabelOverlapCircuitJson } from "../assets/multi-sheet-component-label-overlap"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("retains exact collision regions and excludes other sheets at identical coordinates", async () => {
  const circuitJson = await createMultiSheetComponentLabelOverlapCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const collisions = analysis.getIssues({ issueTypes: ["NetLabelCollision"] })
  expect(collisions).toHaveLength(2)
  const issue = collisions[1]!
  if (issue.lineItemType !== "NetLabelCollision")
    throw new Error("Expected collision")
  const input = {
    circuitJson,
    analysis,
    schematicSheetId: issue.schematicSheetId,
    issueTypes: ["NetLabelCollision" as const],
  }
  expect(analysis.getIssueCounts().NetLabelCollision).toBe(2)
  expect(analysis.getIssueCounts(input).NetLabelCollision).toBe(1)
  const svg = createIssueOverlaySvg(input)
  expect(svg.match(/data-issue-index=/g)).toHaveLength(1)
  expect(svg).not.toContain('data-issue-index="0"')
  expect(svg).not.toContain("UP1")
  expect(svg).toContain("UL1")
  expect(issue.collisionBounds).toHaveLength(1)
  for (const bounds of issue.collisionBounds!) {
    expect(bounds.right).toBeGreaterThan(bounds.left)
    expect(bounds.top).toBeGreaterThan(bounds.bottom)
    expect(svg).toContain(
      `<rect x="${bounds.left}" y="${bounds.bottom}" width="${bounds.right - bounds.left}" height="${bounds.top - bounds.bottom}" fill="#ef444433"`,
    )
  }
  expect(createIssueReproSnapshot(input)).toMatchSvgSnapshot(import.meta.path)
})
