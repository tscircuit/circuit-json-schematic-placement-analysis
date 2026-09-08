import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSeriesChainMisalignedCircuitJson } from "../assets/series-chain-misaligned"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createSeriesChainMisalignedCircuitJson()
  expectReproRendered(circuitJson, 3)
  expectReproNets(circuitJson, [
    ["net.IN", "R1.pin1"],
    ["R1.pin2", "L1.pin1"],
    ["L1.pin2", "R2.pin1"],
    ["R2.pin2", "net.OUT"],
  ])

  const first = getReproSchematicComponent(circuitJson, "R1")
  const middle = getReproSchematicComponent(circuitJson, "L1")
  const last = getReproSchematicComponent(circuitJson, "R2")
  expect(first.center.x).toBeLessThan(middle.center.x)
  expect(middle.center.x).toBeLessThan(last.center.x)
  expect(new Set([first.center.y, middle.center.y, last.center.y]).size).toBe(3)
  expect(middle.size.height).toBeGreaterThan(middle.size.width)

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

test.failing("reports a bent R-L-R chain without a diode or multi-pin component", () => {
  expect(issueTypes).toContain("SeriesChainNotAligned")
})
