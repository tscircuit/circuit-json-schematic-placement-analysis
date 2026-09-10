import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorsNotCloseCircuitJson } from "../assets/decoupling-capacitors-not-close"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("detects decoupling capacitors on the same rail placed far apart", async () => {
  const circuitJson = await createDecouplingCapacitorsNotCloseCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toContain("DecouplingCapacitorsNotCloseTogether")
  expect(analysis.toString()).toContain('rail="VCC"')
  expect(analysis.toString()).toContain('capacitorNames="C1, C2"')

  const issues = analysis.getIssues({
    issueTypes: ["DecouplingCapacitorsNotCloseTogether"],
  })
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    lineItemType: "DecouplingCapacitorsNotCloseTogether",
    railName: "VCC",
    capacitorSchematicBoxes: [
      { sourceComponentName: "C1" },
      { sourceComponentName: "C2" },
    ],
  })
})
