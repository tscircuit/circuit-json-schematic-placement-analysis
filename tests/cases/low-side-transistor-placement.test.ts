import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import driver from "../assets/low-side-transistor-driver.circuit.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("places a grounded-emitter NPN below its load with collector up and emitter down", async () => {
  const original = structuredClone(driver.before) as CircuitJson
  const serialized = JSON.stringify(original)
  const analysis = analyzeSchematicPlacement(original)
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "LowSideTransistorNotAlignedWithLoad",
    )
  expect(JSON.stringify(original)).toBe(serialized)
  expectReproRendered(original, 4)
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    transistorSchematicBox: { sourceComponentName: "Q1" },
    loadSchematicBox: { sourceComponentName: "BZ1" },
    baseResistorSchematicBox: { sourceComponentName: "R1" },
    clampDiodeSchematicBox: { sourceComponentName: "D1" },
    placementProblems: [
      "transistor_not_below_load",
      "collector_not_up",
      "emitter_not_down",
    ],
  })
  expect(analysis.getIssueCounts().LowSideTransistorNotAlignedWithLoad).toBe(1)
  expect(analysis.toString()).toContain('transistorName="Q1" loadName="BZ1"')
  const beforeSvg = createSchematicAnalysisFixtureSvg({
    circuitJson: original,
    analysis,
    highlightIssues: ["LowSideTransistorNotAlignedWithLoad"],
  })
  // Four component badges, plus a matching numbered badge in the listing.
  expect([...beforeSvg.matchAll(/class="issue-marker"/g)]).toHaveLength(4)
  expect(beforeSvg).toContain('data-listing-issue-number="1"')
  expect(beforeSvg).toMatchSvgSnapshot(import.meta.path, "before")

  const rotated = structuredClone(driver.after) as CircuitJson
  getReproSchematicComponent(rotated, "Q1").center.y = 3
  const rotatedOnly = analyzeSchematicPlacement(rotated)
    .getIssues()
    .find(
      (issue) => issue.lineItemType === "LowSideTransistorNotAlignedWithLoad",
    )
  expect(rotatedOnly?.placementProblems).toEqual(["transistor_not_below_load"])
  const moved = structuredClone(original)
  getReproSchematicComponent(moved, "Q1").center.y = -3
  const movedOnly = analyzeSchematicPlacement(moved)
    .getIssues()
    .find(
      (issue) => issue.lineItemType === "LowSideTransistorNotAlignedWithLoad",
    )
  expect(movedOnly?.placementProblems).toEqual([
    "collector_not_up",
    "emitter_not_down",
  ])

  const corrected = structuredClone(driver.after) as CircuitJson
  const correctedAnalysis = analyzeSchematicPlacement(corrected)
  expect(
    correctedAnalysis.getIssueCounts().LowSideTransistorNotAlignedWithLoad,
  ).toBe(0)
  const sourceRecords = (json: typeof original) =>
    json.filter(
      (e) => e.type.startsWith("source_") && !e.type.endsWith("_warning"),
    )
  expect(sourceRecords(corrected)).toEqual(sourceRecords(original))
  for (const circuitJson of [original, corrected]) {
    expectReproNets(circuitJson, [
      ["Q1.emitter", "net.GND"],
      ["Q1.collector", "BZ1.NEG", "D1.anode"],
      ["BZ1.POS", "D1.cathode", "net.VCC"],
      ["R1.pin2", "Q1.base"],
      ["R1.pin1", "net.INPUT"],
    ])
  }
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: corrected,
      analysis: correctedAnalysis,
      highlightIssues: ["LowSideTransistorNotAlignedWithLoad"],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "after")
})
