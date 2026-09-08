import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createFunctionalBlockScatteredCircuitJson } from "../assets/functional-block-scattered"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createFunctionalBlockScatteredCircuitJson()
  expectReproRendered(circuitJson, 4)
  expectReproNets(circuitJson, [
    ["R1.pin2", "net.VCC"],
    ["R1.pin1", "C1.pin1", "U1.RESET_N"],
    ["C1.pin2", "net.GND"],
    ["U2.SDA", "net.SDA"],
    ["U2.SCL", "net.SCL"],
  ])

  expect(
    getReproSourcePort(circuitJson, "U1", "RESET_N").needs_external_pullup,
  ).toBe(true)
  const host = getReproSchematicComponent(circuitJson, "U1")
  const resistor = getReproSchematicComponent(circuitJson, "R1")
  const capacitor = getReproSchematicComponent(circuitJson, "C1")
  const unrelated = getReproSchematicComponent(circuitJson, "U2")
  expect(resistor.center.x).toBe(capacitor.center.x)
  expect(host.center.x - resistor.center.x).toBeGreaterThan(10)
  expect(unrelated.center.x).toBeGreaterThan(resistor.center.x)
  expect(unrelated.center.x).toBeLessThan(host.center.x)

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

test.failing("reports a reset network separated from its host by unrelated circuitry", () => {
  expect(issueTypes).toContain("FunctionalBlockNotGrouped")
})
