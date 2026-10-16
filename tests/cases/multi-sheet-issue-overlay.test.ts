import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createMultiSheetComponentLabelOverlapCircuitJson } from "../assets/multi-sheet-component-label-overlap"
import { createIssueOverlaySvg } from "../fixtures/create-issue-overlay-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("renders the selected sheet without overlays or artifacts when no collisions remain", async () => {
  const circuitJson = await createMultiSheetComponentLabelOverlapCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const collisions = analysis.getIssues({ issueTypes: ["NetLabelCollision"] })
  expect(collisions).toEqual([])
  const sheet = circuitJson.find(
    (element) => element.type === "schematic_sheet" && element.name === "Logic",
  )
  if (sheet?.type !== "schematic_sheet") throw new Error("Missing Logic sheet")
  const input = {
    circuitJson,
    analysis,
    schematicSheetId: sheet.schematic_sheet_id,
    issueTypes: ["NetLabelCollision" as const],
  }
  expect(analysis.getIssueCounts().NetLabelCollision).toBe(0)
  expect(analysis.getIssueCounts(input).NetLabelCollision).toBe(0)
  const svg = createIssueOverlaySvg(input)
  expect(svg).not.toContain("data-issue-index=")
  expect(svg).not.toContain("UP1")
  expect(svg).toContain("UL1")
  const artifacts = createSchematicPlacementIssueArtifacts(circuitJson, {
    analysis,
    schematicSheetId: sheet.schematic_sheet_id,
    issueTypes: ["NetLabelCollision"],
  })
  expect(artifacts).toEqual([])
  const snapshot = createIssueReproSnapshot(input)
  expect(snapshot).not.toContain("NetLabelCollision:")
  expect(snapshot).toContain("Matching issues: 0")
  expect(snapshot).not.toContain("ComponentOverlap: 0")
  expect(snapshot).toMatchSvgSnapshot(import.meta.path)
})
