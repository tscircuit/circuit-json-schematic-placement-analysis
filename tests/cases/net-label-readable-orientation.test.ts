import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { readableNetLabelCircuitJson } from "../assets/net-label-orientation-circuits"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("no orientation issue for readable net label", async () => {
  const analysis = analyzeSchematicPlacement(readableNetLabelCircuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  expect(issuesLineItem).toBeUndefined()

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: readableNetLabelCircuitJson,
      analysis,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
