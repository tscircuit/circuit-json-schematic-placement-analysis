import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createResetGroupingVariant } from "../assets/reset-grouping-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("measures grouping from the reset pin instead of the center of a large chip", async () => {
  const circuitJson = await createResetGroupingVariant("large-host")
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    getPlacementIssues(analysis).filter(
      (e) => e.lineItemType === "ResetNetworkNotGrouped",
    ),
  ).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
