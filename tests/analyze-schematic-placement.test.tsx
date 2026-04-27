import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"

const renderCircuitJson = async (
  element: Parameters<InstanceType<typeof Circuit>["add"]>[0],
): Promise<CircuitJson> => {
  const circuit = new Circuit()
  circuit.add(element)
  await circuit.renderUntilSettled()

  return circuit.getCircuitJson() as CircuitJson
}

test("outputs schematic box positions", async () => {
  const circuitJson = await renderCircuitJson(
    <board width="10mm" height="10mm">
      <schematicbox schX={10} schY={-3.125} width={2.5} height={1.25} />
      <schematicbox
        schX={-1}
        schY={5}
        width={4}
        height={2}
        strokeStyle="dashed"
      />
    </board>,
  )
  const analysis = analyzeSchematicPlacement(circuitJson)

  expect(analysis.getLineItems()).toEqual([
    {
      lineItemType: "SchematicBoxPlacement",
      positionAnchor: "center",
      schX: 8.75,
      schY: -3.75,
      width: 2.5,
      height: 1.25,
    },
    {
      lineItemType: "SchematicBoxPlacement",
      positionAnchor: "center",
      schX: -3,
      schY: 4,
      width: 4,
      height: 2,
    },
  ])
  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicBoxPositions>
    <SchematicBoxPlacement positionAnchor="center" schX="8.75" schY="-3.75" width="2.5" height="1.25" />
    <SchematicBoxPlacement positionAnchor="center" schX="-3" schY="4" width="4" height="2" />
    </SchematicBoxPositions>"
  `)
  expect(analysis.getString()).toBe(analysis.toString())
})

test("returns an empty wrapper when there are no schematic boxes", () => {
  const analysis = analyzeSchematicPlacement([])

  expect(analysis.getLineItems()).toEqual([])
  expect(analysis.toString()).toBe(
    "<SchematicBoxPositions>\n</SchematicBoxPositions>",
  )
})

test("reports horizontal capacitor symbols", async () => {
  const circuitJson = await renderCircuitJson(
    <board width="12mm" height="8mm">
      <capacitor
        name="C_horizontal"
        capacitance="1uF"
        footprint="0402"
        schX={0}
        schY={0}
        schOrientation="horizontal"
      />
      <capacitor
        name="C_vertical"
        capacitance="1uF"
        footprint="0402"
        schX={4}
        schY={0}
        schOrientation="vertical"
      />
      <resistor
        name="R_horizontal"
        resistance="1k"
        footprint="0402"
        schX={8}
        schY={0}
        schOrientation="horizontal"
      />
    </board>,
  )
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  const issue = issuesLineItem?.issues[0]
  if (issue?.lineItemType !== "CapacitorSymbolHorizontal") {
    throw new Error("Expected a capacitor orientation issue")
  }
  const schematicComponent = circuitJson.find(
    (
      element,
    ): element is Extract<
      CircuitJson[number],
      { type: "schematic_component" }
    > =>
      element.type === "schematic_component" &&
      element.schematic_component_id ===
        issue.schematicBox.schematicComponentId,
  )
  const sourceComponent = circuitJson.find(
    (
      element,
    ): element is Extract<CircuitJson[number], { type: "source_component" }> =>
      element.type === "source_component" &&
      element.source_component_id === schematicComponent?.source_component_id,
  )

  expect(issuesLineItem?.issues).toHaveLength(1)
  expect(issue.lineItemType).toBe("CapacitorSymbolHorizontal")
  expect(issue.schematicBox.width).toBeGreaterThan(issue.schematicBox.height)
  expect(sourceComponent).toMatchObject({
    type: "source_component",
    ftype: "simple_capacitor",
    name: "C_horizontal",
  })
})
