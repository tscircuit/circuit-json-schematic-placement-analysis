import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createResetGroupingVariant } from "../assets/reset-grouping-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("does not choose a host for a reset shared by multiple chips", async () => {
  const circuitJson = await createResetGroupingVariant("shared")
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
