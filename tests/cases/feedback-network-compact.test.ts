import { expect, test } from "bun:test"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("accepts compact feedback above and below a rotated amplifier", async () => {
  for (const [variant, feedbackY, amplifierRotation] of [
    ["above", 2, 0],
    ["below-rotated", -2, 180],
  ] as const) {
    const circuitJson = await createFeedbackNetworkScatteredCircuitJson({
      feedbackY,
      amplifierRotation,
    })
    expectReproRendered(circuitJson, 3)
    expectReproNets(circuitJson, [
      ["U1.output", "R1.pin2"],
      ["U1.inverting_input", "R1.pin1", "R2.pin2"],
    ])
    expect(
      inspectNetworkFixture(circuitJson, import.meta.path, variant).feedback,
    ).toEqual([])
  }
})
