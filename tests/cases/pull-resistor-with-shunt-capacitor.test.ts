import { expect, test } from "bun:test"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("still recognizes a pull-up when its signal has a local shunt capacitor", async () => {
  const circuitJson = await createPullResistorsWrongSideCircuitJson({
    shuntCapacitor: true,
  })
  expectReproRendered(circuitJson, 4)
  expectReproNets(circuitJson, [
    ["R1.pin2", "U1.RESET_N", "C1.pin1"],
    ["C1.pin2", "net.GND"],
    ["R1.pin1", "net.VCC"],
  ])
  expect(
    inspectNetworkFixture(circuitJson, import.meta.path).pulls.map(
      (issue) => issue.resistorSchematicBox.sourceComponentName,
    ),
  ).toEqual(["R1", "R2"])
})
