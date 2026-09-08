import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createResetGroupingVariant } from "../assets/reset-grouping-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("resolves reset membership from source traces when connectivity keys are absent", async () => {
  const circuitJson = await createResetGroupingVariant("scattered")
  // Older exporters can omit this derived cache. Keep all actual connections.
  for (const element of circuitJson) {
    if ("subcircuit_connectivity_map_key" in element)
      delete element.subcircuit_connectivity_map_key
  }
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
