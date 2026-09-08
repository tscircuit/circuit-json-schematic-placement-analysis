import { expect, test } from "bun:test"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("accepts compact parallel feedback with a horizontal capacitor", async () => {
  const circuitJson = await createFeedbackNetworkScatteredCircuitJson({
    feedbackY: 1.5,
    capacitorY: 2.5,
  })
  expectReproRendered(circuitJson, 4)
  expectReproNets(circuitJson, [
    ["U1.output", "R1.pin2", "C1.pin2"],
    ["U1.inverting_input", "R1.pin1", "C1.pin1", "R2.pin2"],
    ["U1.non_inverting_input", "net.IN"],
    ["R2.pin1", "net.GND"],
  ])
  const { analysis } = inspectNetworkFixture(circuitJson, import.meta.path)
  expect(analysis.toString()).toBe("")
})
