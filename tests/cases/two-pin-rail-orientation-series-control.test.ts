import { expect, test } from "bun:test"
import { createHorizontalSeriesComponentsCircuitJson } from "../assets/horizontal-series-components"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("accepts a horizontal signal-series inductor and a declared series supply diode", async () => {
  const circuitJson = await createHorizontalSeriesComponentsCircuitJson()
  expectReproRendered(circuitJson, 5)
  expectReproNets(circuitJson, [
    ["U1.OUT", "L3.pin1"],
    ["U2.IN", "L3.pin2"],
    ["net.VCC", "D4.pin1"],
    ["U3.VDD", "D4.pin2"],
  ])
  expect(getReproSourcePort(circuitJson, "U3", "VDD").requires_power).toBe(true)
  const { analysis } = inspectNetworkFixture(circuitJson, import.meta.path)
  expect(analysis.toString()).toBe("")
})
