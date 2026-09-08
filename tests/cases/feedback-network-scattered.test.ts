import { beforeAll, expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let issueTypes: string[]

// Setup failures (including snapshot mismatches) must not be swallowed by test.failing.
beforeAll(async () => {
  const circuitJson = await createFeedbackNetworkScatteredCircuitJson()
  expectReproRendered(circuitJson, 3)
  expectReproNets(circuitJson, [
    ["U1.non_inverting_input", "net.IN"],
    ["U1.positive_supply", "net.VCC"],
    ["U1.negative_supply", "R2.pin1", "net.GND"],
    ["U1.output", "R1.pin2"],
    ["U1.inverting_input", "R1.pin1", "R2.pin2"],
  ])

  const amplifier = getReproSchematicComponent(circuitJson, "U1")
  const feedback = getReproSchematicComponent(circuitJson, "R1")
  expect(feedback.center.y - amplifier.center.y).toBeGreaterThan(6)

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

test.failing("reports an op-amp feedback resistor far outside the amplifier stage", () => {
  expect(issueTypes).toContain("FeedbackNetworkNotCompact")
})
