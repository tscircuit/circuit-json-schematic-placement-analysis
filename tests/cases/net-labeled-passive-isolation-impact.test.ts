import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  type SchematicPlacementIssue,
} from "lib/index"
import { realSchematics } from "../repros/real-schematics"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("records isolated labeled passives in six real schematics while preserving default analysis", () => {
  const issueTypes = ["NetLabeledPassiveIsolated"] as const
  const found: string[][] = []
  for (const fixture of realSchematics) {
    const json = fixture.circuitJson,
      before = JSON.stringify(json)
    const defaults = analyzeSchematicPlacement(json)
    expect(defaults.getIssues({ issueTypes })).toEqual([])
    const oldTypes = Object.keys(defaults.getIssueCounts()).filter(
      (t) => t !== issueTypes[0],
    ) as SchematicPlacementIssue["lineItemType"][]
    expect(defaults.getIssues()).toEqual(
      analyzeSchematicPlacement(json, { issueTypes: oldTypes }).getIssues(),
    )
    const selected = analyzeSchematicPlacement(json, { issueTypes })
    found.push(
      selected.getIssues().map((i) => {
        if (i.lineItemType !== issueTypes[0]) throw new Error("Unexpected type")
        return i.passiveComponent.sourceComponentName!
      }),
    )
    if (fixture === realSchematics.at(-1)) {
      expect(selected.getIssues()).toMatchObject([
        {
          passiveComponent: { sourceComponentName: "R13" },
          connectedComponents: [
            { sourceComponentName: "U1" },
            { sourceComponentName: "LED1" },
          ],
        },
      ])
      const svg = createIssueReproSnapshot({
        circuitJson: json,
        analysis: selected,
        issueTypes: [...issueTypes],
        issueIndex: 0,
        showOverlay: true,
        showListingIssueMarkers: true,
        width: 1600,
        height: 1000,
      })
      const issue = selected.getIssues()[0]!
      if (issue.lineItemType !== issueTypes[0])
        throw new Error("Unexpected type")
      expect(svg).toContain(
        `data-schematic-sheet-id="${issue.passiveComponent.schematicSheetId}"`,
      )
      expect(svg).toContain("03 · ESP32 / CONTROLS")
      expect(svg).not.toContain("01 · USB-C INPUT / PROTECTION")
      expect(
        [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((m) =>
          Number(m[1]),
        ),
      ).toEqual([1, 1, 1])
      expect([
        ...svg.matchAll(/data-passive-distance-source-port=/g),
      ]).toHaveLength(2)
      expect(svg).toMatchSvgSnapshot(import.meta.path, "museview")
    }
    expect(JSON.stringify(json)).toBe(before)
  }
  expect(found).toEqual([[], [], [], [], ["R26", "R23"], ["R13"]])
})
