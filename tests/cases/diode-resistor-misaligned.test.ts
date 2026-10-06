import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createCircuitJson } from "../assets/diode-resistor-misaligned"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("plain diode misaligned with resistor — same X, different Y, trace has corners", async () => {
  const circuitJson = await createCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(
    analysis.getIssues({ issueTypes: ["DiodeResistorNotAligned"] }),
  ).toHaveLength(1)
  const rotations = analysis.getIssues({
    issueTypes: ["TwoPinComponentShouldBeVertical"],
  })
  expect(rotations).toHaveLength(2)
  expect(rotations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        schematicBox: expect.objectContaining({ sourceComponentName: "D1" }),
        railType: "power",
        suggestedRailFacingDirection: "up",
        deltaSchRotation: -90,
      }),
      expect.objectContaining({
        schematicBox: expect.objectContaining({ sourceComponentName: "R1" }),
        railType: "ground",
        suggestedRailFacingDirection: "down",
        deltaSchRotation: -90,
      }),
    ]),
  )

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
