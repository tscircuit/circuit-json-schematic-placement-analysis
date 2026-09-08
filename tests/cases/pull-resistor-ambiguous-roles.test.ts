import { expect, test } from "bun:test"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("requires electrical metadata and skips a shared bus or a zero-ohm link", async () => {
  for (const [variant, options, expectedNames] of [
    ["no-pull-metadata", { declarePulls: false }, []],
    ["no-rail-metadata", { declareRails: false }, []],
    ["shared-signal", { sharedSignal: true }, ["R2"]],
    ["zero-ohm-link", { pullUpResistance: "0" }, ["R2"]],
  ] as const) {
    const circuitJson = await createPullResistorsWrongSideCircuitJson(options)
    expectReproRendered(circuitJson, options.sharedSignal ? 4 : 3)
    expect(
      inspectNetworkFixture(circuitJson, import.meta.path, variant).pulls.map(
        (issue) => issue.resistorSchematicBox.sourceComponentName,
      ),
    ).toEqual([...expectedNames])
  }
})
