import { expect, test } from "bun:test"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("accepts conventional pulls and horizontal signal-level resistors", async () => {
  for (const [variant, pullUpY, pullDownY, resistorRotation] of [
    ["conventional", 3, -3, 270],
    ["horizontal", 0.1, -0.1, 0],
  ] as const) {
    const circuitJson = await createPullResistorsWrongSideCircuitJson({
      pullUpY,
      pullDownY,
      resistorRotation,
    })
    expectReproRendered(circuitJson, 3)
    expectReproNets(circuitJson, [
      ["R1.pin1", "net.VCC"],
      ["R1.pin2", "U1.RESET_N"],
      ["R2.pin1", "U1.BOOT"],
      ["R2.pin2", "net.GND"],
    ])
    expect(
      inspectNetworkFixture(
        circuitJson,
        import.meta.path,
        variant,
      ).analysis.toString(),
    ).toBe("")
  }
})
