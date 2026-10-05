import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { renderBldcSymbol } from "../assets/bldc-pin-padding"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not shrink the BLDC board's standard USB-C artwork", async () => {
  const circuitJson = await renderBldcSymbol("J1")
  expect(
    circuitJson.find((element) => element.type === "source_component"),
  ).toMatchObject({ ftype: "simple_connector", standard: "usb_c" })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
    )
  expect(issues).toHaveLength(0)
  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis, height: 550 }),
  ).toMatchSvgSnapshot(import.meta.path)
})
