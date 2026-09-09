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
  expect(analysis.toString()).toContain('firstCapacitorName="C1"')
  expect(analysis.toString()).toContain('secondCapacitorName="C2"')
  expect(analysis.getIssueCounts().DecouplingCapacitorsNotCloseTogether).toBe(1)

  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  const decouplingIssue =
    issuesLineItem?.lineItemType === "SchematicPlacementIssues"
      ? issuesLineItem.issues.find(
          (issue) =>
            issue.lineItemType === "DecouplingCapacitorsNotCloseTogether",
        )
      : undefined

  expect(decouplingIssue).toMatchObject({
    lineItemType: "DecouplingCapacitorsNotCloseTogether",
    railName: "VCC",
    firstCapacitorSchematicBox: {
      sourceComponentName: "C1",
    },
    secondCapacitorSchematicBox: {
      sourceComponentName: "C2",
    },
  })
})
