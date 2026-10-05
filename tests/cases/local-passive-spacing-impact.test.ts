import { expect, test } from "bun:test"
import {
  analyzeSchematicPlacement,
  type SchematicPlacementIssue,
} from "lib/index"
import { SchematicPlacementPipeline } from "lib/solvers/SchematicPlacementPipeline/SchematicPlacementPipeline"
import { realSchematics } from "../repros/real-schematics"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("keeps spacing advice opt-in and records its impact including intentionally spaced layouts", () => {
  const issueTypes = ["LocalPassiveConnectionTooLong"] as const
  const observed: number[] = []
  for (const fixture of realSchematics) {
    const { circuitJson } = fixture
    const original = JSON.stringify(circuitJson)
    const defaults = analyzeSchematicPlacement(circuitJson)
    expect(defaults.getIssues({ issueTypes })).toEqual([])
    expect(defaults.getIssueCounts().LocalPassiveConnectionTooLong).toBe(0)
    const existingTypes = Object.keys(defaults.getIssueCounts()).filter(
      (type) => type !== issueTypes[0],
    ) as SchematicPlacementIssue["lineItemType"][]
    expect(defaults.getIssues()).toEqual(
      analyzeSchematicPlacement(circuitJson, {
        issueTypes: existingTypes,
      }).getIssues(),
    )
    const selected = analyzeSchematicPlacement(circuitJson, { issueTypes })
    observed.push(selected.getIssues().length)
    expect(JSON.stringify(circuitJson)).toBe(original)
    if (fixture.name.startsWith("Museview")) {
      expect(selected.getIssues()).toMatchObject([
        {
          firstComponent: { sourceComponentName: "J1" },
          secondComponent: { sourceComponentName: "R1" },
        },
        {
          firstComponent: { sourceComponentName: "J1" },
          secondComponent: { sourceComponentName: "R2" },
        },
        {
          firstComponent: { sourceComponentName: "U1" },
          secondComponent: { sourceComponentName: "R13" },
        },
      ])
      const pipeline = new SchematicPlacementPipeline(circuitJson)
      pipeline.solve()
      expect(Object.keys(pipeline.startTimeOfStage)).not.toContain(
        "LocalPassiveSpacingSolver",
      )
      expect(
        createSchematicAnalysisFixtureSvg({
          circuitJson,
          analysis: selected,
          highlightIssues: true,
          width: 1600,
          height: 1000,
        }),
      ).toMatchSvgSnapshot(import.meta.path, "museview-opt-in")
    }
  }
  // The tuner's orderly LED bank contributes seven intentional-separation candidates.
  // These counts are advisory candidates, not a claimed false-positive rate.
  expect(observed).toEqual([7, 4, 6, 14, 11, 3])
})
