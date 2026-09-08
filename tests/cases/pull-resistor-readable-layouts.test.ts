import { expect, test } from "bun:test"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { inspectNetworkFixture } from "../fixtures/network-placement-test-helpers"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

test("accepts vertical rail resistors and reports horizontal rail branches", async () => {
  for (const [variant, pullUpY, pullDownY, resistorRotation] of [
    ["conventional", 3, -3, 270],
    ["horizontal", 0.1, -0.1, 0],
  ] as const) {
    const circuitJson = await createPullResistorsWrongSideCircuitJson({
      pullUpY,
      pullDownY,
      resistorRotation,
      declarePullRequirements: variant !== "horizontal",
    })
    expectReproRendered(circuitJson, 3)
    expectReproNets(circuitJson, [
      ["R1.pin1", "net.VCC"],
      ["R1.pin2", "U1.RESET_N"],
      ["R2.pin1", "U1.BOOT"],
      ["R2.pin2", "net.GND"],
    ])
    const { analysis } = inspectNetworkFixture(
      circuitJson,
      import.meta.path,
      variant,
    )
    if (variant === "conventional") {
      expect(analysis.toString()).toBe("")
    } else {
      const issues = analysis
        .getLineItems()
        .flatMap((item) =>
          item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
        )
      expect(issues).toHaveLength(2)
      expect(issues).toMatchObject([
        {
          lineItemType: "TwoPinComponentShouldBeVertical",
          schematicBox: { sourceComponentName: "R1" },
          railPinName: "pin1",
          railType: "power",
          deltaSchRotation: -90,
          suggestedRailFacingDirection: "up",
        },
        {
          lineItemType: "TwoPinComponentShouldBeVertical",
          schematicBox: { sourceComponentName: "R2" },
          railPinName: "pin2",
          railType: "ground",
          deltaSchRotation: -90,
          suggestedRailFacingDirection: "down",
        },
      ])
      // Recognition uses the rail connections, without requiring pull-specific pin metadata.
      expect(
        circuitJson.some(
          (item) =>
            item.type === "source_port" &&
            (item.needs_external_pullup || item.needs_external_pulldown),
        ),
      ).toBe(false)
      expect(analysis.toString()).toContain("<TwoPinComponentShouldBeVertical")
    }
  }
})
