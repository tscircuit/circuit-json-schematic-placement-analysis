import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

test("PNP rail orientation follows connected rails without assuming NPN terminal order", async () => {
  const render = async (rotation: number) => {
    const circuit = new Circuit()
    circuit.pcbDisabled = true
    circuit.add(
      <board>
        <transistor
          name="Q1"
          type="pnp"
          schX={0}
          schY={0}
          schRotation={rotation}
        />
        <resistor
          name="R1"
          resistance="1k"
          schX={-3}
          schY={1}
          connections={{ pin1: "net.V5", pin2: ".Q1 .emitter" }}
        />
        <resistor
          name="R2"
          resistance="10k"
          schX={3}
          schY={-1}
          connections={{ pin1: ".Q1 .collector", pin2: "net.GND" }}
        />
        <resistor
          name="R3"
          resistance="100k"
          schX={0}
          schY={-3}
          connections={{ pin1: ".Q1 .base", pin2: "net.INPUT" }}
        />
      </board>,
    )
    await circuit.renderUntilSettled()
    return circuit.getCircuitJson()
  }
  const before = await render(0)
  expectReproRendered(before, 4)
  const analysis = analyzeSchematicPlacement(before)
  const [issue] = analysis.getIssues({
    issueTypes: ["TransistorHasIncorrectRailOrientation"],
  })
  expect(issue?.lineItemType).toBe("TransistorHasIncorrectRailOrientation")
  if (issue?.lineItemType !== "TransistorHasIncorrectRailOrientation")
    throw new Error("Missing PNP issue")
  expect(issue.supplyResistorSchematicBox.sourceComponentName).toBe("R1")
  expect(issue.groundResistorSchematicBox.sourceComponentName).toBe("R2")
  const after = await render(issue.deltaSchRotation)
  expectReproRendered(after, 4)
  expect(
    analyzeSchematicPlacement(after, {
      issueTypes: ["TransistorHasIncorrectRailOrientation"],
    }).getIssues(),
  ).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: before,
      analysis,
      highlightIssues: ["TransistorHasIncorrectRailOrientation"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
