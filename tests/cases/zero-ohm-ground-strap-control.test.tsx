import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("still reports a horizontal 0 ohm strap from a pin to ground", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "none" }}>
      <net name="GND" isGroundNet />
      <chip
        name="U1"
        schX={0}
        schY={0}
        pinLabels={{ pin1: "MODE", pin2: "VSS" }}
        schPinArrangement={{ leftSide: ["pin1", "pin2"] }}
        pinAttributes={{ pin2: { requiresGround: true } }}
      />
      <resistor name="R1" resistance="0" schX={-3} schY={0.1} />
      <trace from=".R1 > .pin1" to=".U1 > .pin1" />
      <trace from=".R1 > .pin2" to="net.GND" />
      <trace from=".U1 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["TwoPinComponentShouldBeVertical"],
  })
  // A 0 ohm configuration strap to ground is a branch, drawn vertically by TI.
  expect(analysis.getIssues()).toMatchObject([
    { schematicBox: { sourceComponentName: "R1" }, railType: "ground" },
  ])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
