import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reports an op-amp feedback resistor far outside the amplifier stage", async () => {
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
  const issues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
  const matching = issues.filter(
    (issue) => issue.lineItemType === "FeedbackNetworkNotCompact",
  )
  expect(matching).toHaveLength(1)
  expect(
    matching[0]!.feedbackComponents.map((box) => box.sourceComponentName),
  ).toEqual(["R1"])
  expect(matching[0]!.distantComponents[0]!.bodyGap).toBeGreaterThan(6)
  expect(analysis.toString()).toContain("<FeedbackNetworkNotCompact")
})
