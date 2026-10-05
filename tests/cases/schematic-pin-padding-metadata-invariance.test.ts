import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

const dimensions = (circuitJson: CircuitJson) =>
  analyzeSchematicPlacement(circuitJson)
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
    .map((issue) => ({
      width: issue.suggestedSchWidth,
      height: issue.suggestedSchHeight,
    }))

test("padding dimensions do not depend on component names, pin names or hints", async () => {
  const original = await renderBldcSymbol("U3", { schHeight: 5 })
  const renamed = structuredClone(original)
  for (const element of renamed) {
    if (element.type === "source_component")
      element.name = "arbitrary_reference"
    if (element.type === "source_port") {
      element.name = "unrelated_name"
      element.port_hints = ["VCC", "GND", "anything"]
    }
    if (element.type === "schematic_port" && element.display_pin_label) {
      element.display_pin_label = "X".repeat(
        Array.from(element.display_pin_label).length,
      )
    }
  }
  expect(dimensions(original)).toHaveLength(1)
  expect(dimensions(renamed)).toEqual(dimensions(original))
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson: renamed, height: 450 }),
  ).toMatchSvgSnapshot(import.meta.path)
})
