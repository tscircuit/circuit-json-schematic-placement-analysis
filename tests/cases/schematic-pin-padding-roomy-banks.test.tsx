import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("accepts centered unequal banks in a 1 mm tall box", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board routingDisabled>
      <chip
        name="U_RGB"
        manufacturerPartNumber="SN74AHCT1G125DCK"
        schWidth={1.2}
        schHeight={1}
        schPinSpacing={0.2}
        pinLabels={{
          pin1: "OE",
          pin2: "A",
          pin3: "GND",
          pin4: "Y",
          pin5: "VCC",
        }}
        schPinArrangement={{
          leftSide: ["pin1", "pin2", "pin3"],
          rightSide: ["pin5", "pin4"],
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.toString()).not.toContain(
    "<SchematicPinPaddingToEdgeTooLarge ",
  )
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicPinPaddingToEdgeTooLarge"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
