import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createHorizontalSeriesComponentsCircuitJson } from "../assets/horizontal-series-components"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reports a horizontal supply diode while accepting a horizontal signal-series inductor", async () => {
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
  const issues = analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
  expect(issues).toMatchObject([
    {
      lineItemType: "TwoPinComponentShouldBeVertical",
      schematicBox: { sourceComponentName: "D4" },
      railPinName: "pin1",
      railType: "power",
      deltaSchRotation: -90,
      suggestedRailFacingDirection: "up",
    },
  ])
  expect(issues).toHaveLength(1)

  // The VCC end must face up even when source ports are listed load-first.
  const reversedSourcePorts = circuitJson
    .filter((item) => item.type === "source_port")
    .reverse()
  const reordered = circuitJson.map((item) =>
    item.type === "source_port" ? reversedSourcePorts.shift()! : item,
  )
  expect(analyzeSchematicPlacement(reordered).toString()).toBe(
    analysis.toString(),
  )
})
