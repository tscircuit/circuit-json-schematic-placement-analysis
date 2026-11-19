import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("still reports a horizontal resistor from a supply to a signal pin", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schLayout={{ layoutMode: "none" }}>
      <net name="V3V3" isPowerNet />
      <chip
        name="U1"
        schX={0}
        schY={0}
        pinLabels={{ pin1: "EN", pin2: "VDD" }}
        schPinArrangement={{ leftSide: ["pin1", "pin2"] }}
        pinAttributes={{ pin2: { requiresPower: true } }}
      />
      <resistor name="R1" resistance="10k" schX={-3} schY={0.1} />
      <trace from=".R1 > .pin1" to="net.V3V3" />
      <trace from=".R1 > .pin2" to=".U1 > .pin1" />
      <trace from=".U1 > .pin2" to="net.V3V3" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["TwoPinComponentShouldBeVertical"],
  })
  // Only one end is a supply node, so this is a shunt that should stand up.
  expect(analysis.getIssues()).toMatchObject([
    { schematicBox: { sourceComponentName: "R1" }, railType: "power" },
  ])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
