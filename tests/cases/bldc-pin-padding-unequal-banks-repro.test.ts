import { expect, test } from "bun:test"
import type { SchematicPort } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces BLDC shrink suggestions that cannot contain the opposite pin bank", async () => {
  for (const name of ["U1", "U3"] as const) {
    const circuitJson = await renderBldcSymbol(name)
    const original = JSON.stringify(circuitJson)
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis
      .getIssues()
      .filter(
        (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
      )
    expect(issues).toHaveLength(1)
    const issue = issues[0]!
    const sidePins = circuitJson.filter(
      (element): element is SchematicPort =>
        element.type === "schematic_port" &&
        (element.side_of_component === "left" ||
          element.side_of_component === "right"),
    )
    const requiredHeight =
      2 *
      Math.max(
        ...sidePins.map((pin) =>
          Math.abs(pin.center.y - issue.schematicBox.schY),
        ),
      )
    // The current recommendation is physically smaller than the pin-bank span.
    expect(issue.suggestedSchHeight!).toBeLessThan(requiredHeight)
    expect(JSON.stringify(circuitJson)).toBe(original)
    await expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis, height: 550 }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
