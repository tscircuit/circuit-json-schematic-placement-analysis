import { expect, test } from "bun:test"
import { createHorizontalSeriesResistorsCircuitJson } from "../assets/horizontal-series-resistors"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("accepts horizontal resistors in signal paths and declared series supply feeds", async () => {
  const circuitJson = await createHorizontalSeriesResistorsCircuitJson()
  expectReproRendered(circuitJson, 5)
  expectReproNets(circuitJson, [
    ["U1.OUT", "R3.pin1"],
    ["U2.IN", "R3.pin2"],
    ["net.VCC", "R4.pin1"],
    ["U3.VDD", "R4.pin2"],
  ])
  expect(getReproSourcePort(circuitJson, "U3", "VDD").requires_power).toBe(true)
  const { analysis } = inspectNetworkFixture(circuitJson, import.meta.path)
  expect(analysis.toString()).toBe("")
})
