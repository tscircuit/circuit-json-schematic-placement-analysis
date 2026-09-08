import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createVoltageDividerScatteredCircuitJson } from "../assets/voltage-divider-scattered"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createVoltageDividerScatteredCircuitJson()
  expectReproRendered(circuitJson, 3)
  expectReproNets(circuitJson, [
    ["R1.pin2", "net.VIN"],
    ["R1.pin1", "R2.pin2", "U1.ADC"],
    ["R2.pin1", "net.GND"],
  ])

  const upper = getReproSchematicComponent(circuitJson, "R1")
  const lower = getReproSchematicComponent(circuitJson, "R2")
  expect(Math.abs(upper.center.x - lower.center.x)).toBeGreaterThan(6)
  expect(upper.center.y - lower.center.y).toBeGreaterThan(5)

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
  issueTypes = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues"
        ? item.issues.map((issue) => issue.lineItemType)
        : [],
    )
})

test.failing("reports a scattered voltage divider and its ADC tap", () => {
  expect(issueTypes).toContain("VoltageDividerNotCompact")
})
