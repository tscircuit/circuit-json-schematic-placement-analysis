import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("still detects side label collisions with singleton supply pins", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board routingDisabled>
      <chip
        name="U1"
        footprint="soic8"
        schWidth={0.77}
        pinLabels={{
          pin1: "VDD",
          pin2: "SDA",
          pin3: "SCL",
          pin4: "EN",
          pin5: "OUT",
          pin6: "INT",
          pin7: "NC",
          pin8: "GND",
        }}
        schPinArrangement={{
          topSide: ["VDD"],
          bottomSide: ["GND"],
          leftSide: ["SDA", "SCL", "EN"],
          rightSide: ["OUT", "INT", "NC"],
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  if (issuesLineItem?.lineItemType !== "SchematicPlacementIssues") {
    throw new Error("Expected schematic placement issues")
  }
  const pinPaddingIssues = issuesLineItem.issues.filter(
    (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
  )

  expect(pinPaddingIssues).toHaveLength(0)
  const collisionIssues = issuesLineItem.issues.filter(
    (issue) => issue.lineItemType === "SchematicBoxInnerLabelCollision",
  )
  expect(collisionIssues).toHaveLength(1)
  expect(collisionIssues[0]!.schematicBox.width).toBeCloseTo(0.77)
  expect(collisionIssues[0]!.overlappingSides).toContain("left")
  expect(collisionIssues[0]!.overlappingSides).toContain("right")
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicBoxInnerLabelCollision"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
