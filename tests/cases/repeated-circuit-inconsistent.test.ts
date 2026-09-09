import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRepeatedCircuitInconsistentCircuitJson } from "../assets/repeated-circuit-inconsistent"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createRepeatedCircuitInconsistentCircuitJson()
  expectReproRendered(circuitJson, 6)
  expectReproNets(circuitJson, [
    ["R1.pin1", "net.IN1"],
    ["R2.pin1", "net.IN2"],
    ["R3.pin1", "net.IN3"],
    ["R1.pin2", "C1.pin1", "net.OUT1"],
    ["R2.pin2", "C2.pin1", "net.OUT2"],
    ["R3.pin2", "C3.pin1", "net.OUT3"],
    ["C1.pin2", "net.GND1"],
    ["C2.pin2", "net.GND2"],
    ["C3.pin2", "net.GND3"],
  ])

  const offsets = [1, 2, 3].map((index) => {
    const resistor = getReproSchematicComponent(circuitJson, `R${index}`)
    const capacitor = getReproSchematicComponent(circuitJson, `C${index}`)
    return {
      x: capacitor.center.x - resistor.center.x,
      y: capacitor.center.y - resistor.center.y,
    }
  })
  expect(offsets[0]).toEqual(offsets[1])
  expect(offsets[2]!.x - offsets[0]!.x).toBeGreaterThan(4)
  expect(offsets[2]!.y).toBe(offsets[0]!.y)

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

test.failing("reports a placement outlier among three equivalent RC channels", () => {
  expect(issueTypes).toContain("RepeatedCircuitLayoutInconsistent")
})
