import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not report corner padding for centered supply pins", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board routingDisabled>
      <chip
        name="U1"
        footprint="soic8"
        schWidth={1.7}
        pinLabels={{
          pin1: "VDD",
          pin2: "SDA",
          pin3: "SCL",
          pin4: "EN",
          pin5: "OUT",
          pin6: "INT",
          pin7: "NC",
          pin8: "GND",
        }}
        schPinArrangement={{
          topSide: ["VDD"],
          bottomSide: ["GND"],
          leftSide: ["SDA", "SCL", "EN"],
          rightSide: ["OUT", "INT", "NC"],
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({ issueTypes: ["SchematicPinPaddingToEdgeTooLarge"] }),
  ).toHaveLength(0)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicPinPaddingToEdgeTooLarge"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
