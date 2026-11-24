import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import type { SchematicBoxPlacement } from "lib/types"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

const bounds = (placement: SchematicBoxPlacement) => ({
  left: placement.schX - placement.width / 2,
  right: placement.schX + placement.width / 2,
  top: placement.schY + placement.height / 2,
  bottom: placement.schY - placement.height / 2,
})

const overlaps = (
  first: SchematicBoxPlacement,
  second: SchematicBoxPlacement,
) => {
  const a = bounds(first)
  const b = bounds(second)
  return (
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1e-9 &&
    Math.min(a.top, b.top) - Math.max(a.bottom, b.bottom) > 1e-9
  )
}

test("correction suggestions fully separate a component contained in a larger box", () => {
  const circuitJson: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "source-u1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "source_component",
      source_component_id: "source-r1",
      ftype: "simple_resistor",
      name: "R1",
      resistance: 1000,
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic-u1",
      source_component_id: "source-u1",
      center: { x: 0, y: 0 },
      size: { width: 6, height: 4 },
      is_box_with_pins: true,
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic-r1",
      source_component_id: "source-r1",
      center: { x: 0, y: 0 },
      size: { width: 0.6, height: 0.65 },
      is_box_with_pins: true,
    },
  ]
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "ComponentOverlap")
  expect(issues).toHaveLength(1)
  const issue = issues[0]!
  if (issue.lineItemType !== "ComponentOverlap")
    throw new Error("Missing overlap issue")
  expect(issue.firstComponent.sourceComponentName).toBe("U1")
  expect(issue.secondComponent.sourceComponentName).toBe("R1")
  expect(overlaps(issue.firstComponent, issue.secondComponent)).toBe(true)

  const target = issue.secondComponent
  const other = issue.firstComponent
  expect(issue.correctionSuggestions).toHaveLength(2)
  for (const suggestion of issue.correctionSuggestions) {
    expect(suggestion.targetComponentName).toBe("R1")
    expect(suggestion.newSchX).toBeCloseTo(
      target.schX + suggestion.deltaSchX,
      9,
    )
    expect(suggestion.newSchY).toBeCloseTo(
      target.schY + suggestion.deltaSchY,
      9,
    )
    expect(
      overlaps(
        {
          ...target,
          schX: suggestion.newSchX,
          schY: suggestion.newSchY,
        },
        other,
      ),
    ).toBe(false)
  }
  expect(issue.correctionSuggestions[0]).toMatchObject({
    deltaSchX: -3.3,
    deltaSchY: 0,
  })
  expect(issue.correctionSuggestions[1]).toMatchObject({
    deltaSchX: 0,
    deltaSchY: -2.325,
  })

  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["ComponentOverlap"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
