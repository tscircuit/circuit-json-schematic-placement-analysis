import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorsNotCloseCircuitJson } from "../assets/decoupling-capacitors-not-close"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test.failing("detects decoupling capacitors on the same rail placed far apart", async () => {
  const circuitJson = await createDecouplingCapacitorsNotCloseCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toContain("DecouplingCapacitorsNotCloseTogether")
  expect(analysis.toString()).toContain('rail="VCC"')
  expect(analysis.toString()).toContain('firstCapacitorName="C1"')
  expect(analysis.toString()).toContain('secondCapacitorName="C2"')

  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  expect(issuesLineItem).toMatchObject({
    lineItemType: "SchematicPlacementIssues",
    issues: [
      {
        lineItemType: "DecouplingCapacitorsNotCloseTogether",
        railName: "VCC",
        firstCapacitorSchematicBox: {
          sourceComponentName: "C1",
        },
        secondCapacitorSchematicBox: {
          sourceComponentName: "C2",
        },
      },
    ],
  })
})
