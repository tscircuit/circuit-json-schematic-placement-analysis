import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createCircuitJson } from "../assets/led-resistor-alignment-2"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("detects led-resistor trace with corners", async () => {
  const circuitJson = await createCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  // const issuesLineItem = analysis
  //   .getLineItems()
  //   .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")

  // expect(issuesLineItem).toMatchObject({
  //   lineItemType: "SchematicPlacementIssues",
  //   issues: expect.arrayContaining([
  //     expect.objectContaining({
  //       lineItemType: "DiodeResistorNotAligned",
  //       diodeSchematicBox: expect.objectContaining({ sourceComponentName: "D1" }),
  //       resistorSchematicBox: expect.objectContaining({
  //         sourceComponentName: "R1",
  //       }),
  //       diodePin: "cathode",
  //       resistorPin: "anode",
  //     }),
  //   ]),
  // })

  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
