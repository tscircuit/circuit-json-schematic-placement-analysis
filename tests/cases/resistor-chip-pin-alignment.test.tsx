import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces a gate resistor offset from its connected chip pin", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <resistor name="R_GLW" resistance="25" schX={-3} schY={0} />
      <inductor name="L1" inductance="10uH" schX={-5} schY={0.6} />
      <chip
        name="Q_LW"
        schX={0}
        schY={0}
        schWidth={1.58}
        schHeight={1.2}
        pinLabels={{
          pin1: "S3",
          pin2: "S2",
          pin3: "S1",
          pin4: "G",
          pin5: "D4",
          pin6: "D3",
          pin7: "D2",
          pin8: "D1",
          pin9: "D0",
        }}
      />
      <trace from=".R_GLW > .pin2" to=".Q_LW > .pin4" />
      <trace from=".L1 > .pin2" to=".Q_LW > .pin1" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const original = JSON.stringify(circuitJson)
  const gate = circuitJson.find(
    (el) => el.type === "schematic_port" && el.pin_number === 4,
  )
  if (gate?.type !== "schematic_port") throw new Error("Missing gate port")
  expect(gate.center.y).toBeCloseTo(-0.2)
  expect(circuitJson.some((el) => el.type === "schematic_trace")).toBe(true)
  expect(circuitJson.filter((el) => el.type.endsWith("error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["ComponentPinsWouldAlignWithVerticalShift"],
  })
  // Both bodies are centered at Y=0, but the connected gate pin is at Y=-0.2.
  // The resistor should move down 0.2 so its output and the gate share a Y coordinate.
  expect(analysis.getIssues()).toMatchObject([
    {
      lineItemType: "ComponentPinsWouldAlignWithVerticalShift",
      targetComponent: { sourceComponentName: "R_GLW" },
      alignedPinCount: 1,
    },
    {
      lineItemType: "ComponentPinsWouldAlignWithVerticalShift",
      targetComponent: { sourceComponentName: "L1" },
      alignedPinCount: 1,
    },
  ])
  const issue = analysis.getIssues()[0]
  if (issue?.lineItemType !== "ComponentPinsWouldAlignWithVerticalShift")
    throw new Error("Missing alignment recommendation")
  expect(issue.deltaSchY).toBeCloseTo(-0.2)
  expect(issue.newSchY).toBeCloseTo(gate.center.y)
  const inductorIssue = analysis.getIssues()[1]
  if (
    inductorIssue?.lineItemType !== "ComponentPinsWouldAlignWithVerticalShift"
  )
    throw new Error("Missing inductor alignment recommendation")
  expect(inductorIssue.deltaSchY).toBeCloseTo(-0.2)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1000,
      height: 450,
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
