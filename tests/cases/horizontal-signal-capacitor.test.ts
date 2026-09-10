import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import type { SchematicPlacementIssue } from "lib/types"
import { createHorizontalSignalCapacitorCircuitJson } from "../assets/horizontal-signal-capacitor"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let capacitorOrientationIssues: SchematicPlacementIssue[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createHorizontalSignalCapacitorCircuitJson()
  expectReproRendered(circuitJson, 5)
  expectReproNets(circuitJson, [
    ["U1.OUT", "R1.pin1"],
    ["R1.pin2", "C1.pin1"],
    ["C1.pin2", "R2.pin1"],
    ["R2.pin2", "U2.IN"],
  ])

  const componentNames = ["U1", "R1", "C1", "R2", "U2"]
  const componentCenters = componentNames.map(
    (name) => getReproSchematicComponent(circuitJson, name).center,
  )
  expect(componentCenters.every(({ y }) => y === 0)).toBe(true)
  expect(componentCenters.map(({ x }) => x)).toEqual([-6, -3.5, 0, 3.5, 6])

  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
  capacitorOrientationIssues = issues.filter(
    (issue) => issue.lineItemType === "CapacitorSymbolHorizontal",
  )
  expect(
    issues.filter(
      (issue) => issue.lineItemType !== "CapacitorSymbolHorizontal",
    ),
  ).toEqual([])

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["CapacitorSymbolHorizontal"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test.failing("accepts a horizontal capacitor aligned with a signal path", () => {
  expect(capacitorOrientationIssues).toEqual([])
})
