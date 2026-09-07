import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDecouplingCapacitorsNotCloseCircuitJson } from "../assets/decoupling-capacitors-not-close"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("detects decoupling capacitors on the same rail placed far apart", async () => {
  const circuitJson = await createDecouplingCapacitorsNotCloseCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(analysis.toString()).toContain("DecouplingCapacitorsNotCloseTogether")
  expect(analysis.toString()).toContain('rail="VCC"')
  expect(analysis.toString()).toContain('firstCapacitorName="C1"')
  expect(analysis.toString()).toContain('secondCapacitorName="C2"')

  const issues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
    .filter(
      (issue) => issue.lineItemType === "DecouplingCapacitorsNotCloseTogether",
    )

  expect(issues).toMatchObject([
    {
      railName: "VCC",
      firstCapacitorSchematicBox: { sourceComponentName: "C1" },
      secondCapacitorSchematicBox: { sourceComponentName: "C2" },
      maxAllowedDistance: 5,
    },
  ])
  expect(issues[0]!.distance).toBeCloseTo(Math.hypot(20, 16))

  const placementNames = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicBoxPlacement"
        ? [lineItem.sourceComponentName]
        : [],
    )
  expect(placementNames).toContain("C1")
  expect(placementNames).toContain("C2")

  await expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
