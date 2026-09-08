import { expect, test } from "bun:test"
import { createRailConnectedTwoPinComponentsCircuitJson } from "../assets/rail-connected-two-pin-components"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("reports horizontal rail-connected two-pin components and accepts their vertical layouts", async () => {
  for (const vertical of [false, true]) {
    const circuitJson = await createRailConnectedTwoPinComponentsCircuitJson({
      vertical,
    })
    expectReproRendered(circuitJson, 6)
    expectReproNets(circuitJson, [
      ["C1.pin2", "net.AGND"],
      ["L1.pin2", "net.GND"],
      ["C2.pin2", "net.PGND"],
      ["LED1.pin2", "net.DGND"],
      ["C2.pin1", "net.VDD"],
      ["R0.pin1", "net.VCC"],
      ["D1.pin1", "net.VREF"],
      ["C1.pin1", "net.FILTER"],
      ["D1.pin2", "net.CLAMP"],
      ["L1.pin1", "net.RF"],
      ["R0.pin2", "net.LINK"],
      ["LED1.pin1", "net.LED"],
    ])
    const { analysis } = inspectNetworkFixture(
      circuitJson,
      import.meta.path,
      vertical ? "vertical" : "horizontal",
    )
    const issues = analysis
      .getLineItems()
      .flatMap((item) =>
        item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
      )
    if (vertical) {
      expect(analysis.toString()).toBe("")
      continue
    }
    // Exactly one orientation issue per component, including capacitors and a zero-ohm link.
    expect(issues).toHaveLength(6)
    const railIssues = issues.filter(
      (issue) => issue.lineItemType === "TwoPinComponentShouldBeVertical",
    )
    expect(
      railIssues.map((issue) => [
        issue.schematicBox.sourceComponentName,
        issue.railType,
      ]),
    ).toEqual([
      ["C1", "ground"],
      ["D1", "power"],
      ["L1", "ground"],
      ["C2", "power"],
      ["R0", "power"],
      ["LED1", "ground"],
    ])
    // Check the suggested rotation against the rendered pin vector, preserving pin identity.
    for (const issue of railIssues) {
      const pin = circuitJson.find(
        (item) =>
          item.type === "schematic_port" &&
          item.source_port_id === issue.railSourcePortId,
      )
      if (pin?.type !== "schematic_port") throw new Error("Missing rail pin")
      const otherPin = circuitJson.find(
        (item) =>
          item.type === "schematic_port" &&
          item.schematic_component_id === pin.schematic_component_id &&
          item.source_port_id !== pin.source_port_id,
      )
      if (otherPin?.type !== "schematic_port")
        throw new Error("Missing other pin")
      const x = pin.center.x - otherPin.center.x
      const y = pin.center.y - otherPin.center.y
      const angle = (issue.deltaSchRotation * Math.PI) / 180
      const rotatedX = x * Math.cos(angle) - y * Math.sin(angle)
      const rotatedY = x * Math.sin(angle) + y * Math.cos(angle)
      // Symbol endpoints can differ by 0.01 mm after renderer rounding.
      expect(Math.abs(rotatedX)).toBeLessThanOrEqual(0.01 + 1e-9)
      expect(issue.railType === "power" ? rotatedY > 0 : rotatedY < 0).toBe(
        true,
      )
    }
  }
})
