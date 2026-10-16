import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { renderParallelLedBranches } from "../fixtures/parallel-led-branches"

const issueTypes = ["ParallelLedBranchesDrawnInline"] as const

test("detects end-to-end parallel LED branches at every cardinal rotation and accepts side-by-side offsets", async () => {
  for (const rotation of [0, 90, 180, 270]) {
    for (const layout of [
      "inline",
      "beside",
      "offset",
      "staggered",
      "overlap",
      "bent",
    ] as const) {
      const json = await renderParallelLedBranches({ rotation, layout })
      expect(json.filter((e) => e.type.endsWith("_error"))).toEqual([])
      const saved = JSON.stringify(json)
      const analysis = analyzeSchematicPlacement(json, { issueTypes })
      const findings = analysis.getIssues()
      expect(findings, `${rotation}:${layout}`).toHaveLength(
        layout === "inline" ? 1 : 0,
      )
      expect(analyzeSchematicPlacement(json).getIssues({ issueTypes })).toEqual(
        findings,
      )
      expect(JSON.stringify(json)).toBe(saved)
      if (layout !== "inline") continue
      expect(analysis.getIssueCounts().ParallelLedBranchesDrawnInline).toBe(1)
      const issue = findings[0]!
      if (issue.lineItemType !== "ParallelLedBranchesDrawnInline")
        throw new Error("Wrong finding")
      expect(issue.branchCount).toBe(3)
      expect(issue.branchSchematicBoxes).toHaveLength(6)
      const artifacts = createSchematicPlacementIssueArtifacts(json, {
        analysis,
        issueTypes,
      })
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]!.bounds).toBeDefined()
      expect(artifacts[0]!.descriptionXml).toContain('branchCount="3"')
      const svg = createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        analysis,
        highlightIssues: [...issueTypes],
      })
      expect(svg.match(/class="issue-marker"/g)).toHaveLength(6)
      expect(svg).toContain('data-listing-issue-number="1"')
      const renamed = structuredClone(json)
      for (const e of renamed) {
        if (e.type === "source_component" || e.type === "source_net")
          e.name = "anonymous"
        if (e.type === "source_port") {
          e.name = "unknown"
          e.port_hints = []
        }
        if (e.type === "schematic_net_label") e.text = "anonymous"
      }
      expect(
        analyzeSchematicPlacement(renamed, { issueTypes }).getIssues(),
      ).toHaveLength(1)
    }
  }
})
