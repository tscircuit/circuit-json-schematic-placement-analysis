import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRcFilterScatteredCircuitJson } from "../assets/rc-filter-scattered"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createRcFilterScatteredCircuitJson()
  expectReproRendered(circuitJson, 4)
  expectReproNets(circuitJson, [
    ["U1.OUT", "R1.pin1"],
    ["R1.pin2", "C1.pin1", "U2.ADC"],
    ["C1.pin2", "net.GND"],
  ])

  const resistor = getReproSchematicComponent(circuitJson, "R1")
  const capacitor = getReproSchematicComponent(circuitJson, "C1")
  expect(resistor.center.y - capacitor.center.y).toBeGreaterThan(5)
  expect(capacitor.center.x).toBeLessThan(resistor.center.x)

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

test.failing("reports a shunt capacitor separated from its series resistor and ADC input", () => {
  expect(issueTypes).toContain("RCFilterNotCompact")
})
