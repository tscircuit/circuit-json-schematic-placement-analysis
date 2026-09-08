import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createResetGroupingVariant } from "../assets/reset-grouping-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("excludes a distant decoupler sharing supply and ground with the reset network", async () => {
  const circuitJson = await createResetGroupingVariant("unrelated-decoupler")
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = getPlacementIssues(analysis).filter(
    (e) => e.lineItemType === "ResetNetworkNotGrouped",
  )
  expect(issues).toHaveLength(1)
  expect(
    issues[0]!.supportComponents.map((p) => p.sourceComponentName),
  ).toEqual(["R1", "C1"])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
