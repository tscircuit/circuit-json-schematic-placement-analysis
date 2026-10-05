import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createLocalPassiveSpacingFixture,
  inspectLocalPassiveSpacing,
} from "../fixtures/local-passive-spacing-fixture"

test("reports a long local passive connection without relying on names or labels", () => {
  const json = createLocalPassiveSpacingFixture()
  const issues = inspectLocalPassiveSpacing(json, import.meta.path)
  expect(issues).toMatchObject([
    {
      lineItemType: "LocalPassiveConnectionTooLong",
      firstComponent: { sourceComponentName: "U1" },
      secondComponent: { sourceComponentName: "R1" },
      sourcePortIds: ["host_signal", "passive_signal"],
      pinDistance: 6,
      maxRecommendedPinDistance: 4,
    },
  ])
  for (const element of json) {
    if (element.type === "source_component") element.name = "GND"
    if (element.type === "source_port") {
      element.name = "VCC"
      element.port_hints = ["GND", "RESET"]
    }
  }
  expect(
    analyzeSchematicPlacement(json, {
      issueTypes: ["LocalPassiveConnectionTooLong"],
    }).getIssues(),
  ).toHaveLength(1)
  for (const metadata of [
    { ftype: "simple_resistor", resistance: 10000 },
    { ftype: "simple_capacitor", capacitance: 0.0000001 },
    { ftype: "simple_inductor", inductance: 0.000001 },
  ]) {
    const typed = createLocalPassiveSpacingFixture()
    const passive = typed.find(
      (element) =>
        element.type === "source_component" &&
        element.source_component_id === "passive",
    )!
    Object.assign(passive, metadata)
    expect(
      analyzeSchematicPlacement(typed, {
        issueTypes: ["LocalPassiveConnectionTooLong"],
      }).getIssues(),
    ).toHaveLength(1)
  }
})
