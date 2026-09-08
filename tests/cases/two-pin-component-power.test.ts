import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTwoPinPowerGroundCircuitJson } from "../assets/two-pin-component-power-ground"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("preserves a resistor connected to VCC instead of recommending a flip", async () => {
  const circuitJson = await createTwoPinPowerGroundCircuitJson({
    componentKind: "resistor",
    rail: "power",
    railPin: 2,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(circuitJson.find((e) => e.type === "source_net")).toMatchObject({
    name: "VCC",
    is_power: true,
  })
  expect(analysis.toString()).not.toContain("TwoPinComponentCouldBeFlipped")
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
