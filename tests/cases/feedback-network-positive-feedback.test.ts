import { expect, test } from "bun:test"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("does not mistake positive feedback or an input-to-ground resistor for negative feedback", async () => {
  const circuitJson = await createFeedbackNetworkScatteredCircuitJson({
    feedbackInput: "non_inverting_input",
  })
  expectReproRendered(circuitJson, 3)
  expectReproNets(circuitJson, [
    ["U1.output", "R1.pin2"],
    ["U1.non_inverting_input", "R1.pin1"],
    ["U1.inverting_input", "R2.pin2"],
    ["R2.pin1", "net.GND"],
  ])
  expect(inspectNetworkFixture(circuitJson, import.meta.path).feedback).toEqual(
    [],
  )
})
