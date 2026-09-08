import { expect, test } from "bun:test"
import { createFeedbackNetworkScatteredCircuitJson } from "../assets/feedback-network-scattered"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("recognizes both networks from source traces when connectivity caches are absent", async () => {
  for (const [variant, create] of [
    ["feedback", createFeedbackNetworkScatteredCircuitJson],
    ["pull", createPullResistorsWrongSideCircuitJson],
  ] as const) {
    const circuitJson = await create()
    expectReproRendered(circuitJson, 3)
    for (const element of circuitJson) {
      if ("subcircuit_connectivity_map_key" in element)
        delete element.subcircuit_connectivity_map_key
    }
    const { feedback, pulls } = inspectNetworkFixture(
      circuitJson,
      import.meta.path,
      variant,
    )
    expect(feedback).toHaveLength(variant === "feedback" ? 1 : 0)
    expect(pulls).toHaveLength(variant === "pull" ? 2 : 0)
  }
})
