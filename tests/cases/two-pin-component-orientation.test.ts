import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createTwoPinComponentOrientationCircuitJson } from "../assets/two-pin-component-orientation"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("suggests flipping a two-pin capacitor that faces away from a connected component", async () => {
  const circuitJson = await createTwoPinComponentOrientationCircuitJson({
    facesConnectedComponent: false,
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

  expect(flipIssues).toHaveLength(1)
  expect(flipIssues[0]).toMatchObject({
    schematicTraceId: "schematic_trace_capacitor_to_chip",
    targetPin: "pin1",
    currentFacingDirection: "up",
    suggestedFacingDirection: "down",
    deltaSchRotation: 180,
    currentTurnCount: 3,
    suggestedTurnCount: 0,
    targetComponent: { sourceComponentName: "C1" },
    connectedComponent: { sourceComponentName: "U1" },
  })

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
