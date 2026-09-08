import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTwoPinComponentOrientationCircuitJson } from "../assets/two-pin-component-orientation"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not suggest flipping a two-pin capacitor that faces its connected component", async () => {
  const circuitJson = await createTwoPinComponentOrientationCircuitJson({
    facesConnectedComponent: true,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const flipIssues = analysis
    .getLineItems()
    .flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )
    .filter((issue) => issue.lineItemType === "TwoPinComponentCouldBeFlipped")

  expect(flipIssues).toHaveLength(0)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
