import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import { withComponentPinLabels } from "../assets/component-pin-labels"
import { createNearTouchingPinLabelsCircuitJson } from "../assets/near-touching-pin-labels"
import { createSchematicPinPaddingToEdgeCircuitJson } from "../assets/schematic-pin-padding-to-edge"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("component fallback labels preserve collisions and safe resize suggestions", async () => {
  for (const variant of [
    {
      name: "collision",
      create: () => createNearTouchingPinLabelsCircuitJson({ dimension: 1.2 }),
      issueType: "SchematicBoxInnerLabelCollision",
    },
    {
      name: "width-resize",
      create: () => createNearTouchingPinLabelsCircuitJson({ dimension: 5 }),
      issueType: "GenericSchematicBoxTooWide",
    },
    {
      name: "pin-padding-resize",
      create: () => createSchematicPinPaddingToEdgeCircuitJson(),
      issueType: "SchematicPinPaddingToEdgeTooLarge",
    },
  ] as const) {
    const explicit = await variant.create()
    const fallback = withComponentPinLabels(explicit)
    const original = structuredClone(fallback)
    expect(
      convertCircuitJsonToSchematicSvg(fallback) ===
        convertCircuitJsonToSchematicSvg(explicit),
    ).toBe(true)
    const options = { issueTypes: [variant.issueType] }
    const baseline = analyzeSchematicPlacement(explicit, options)
    expect(baseline.getIssues()).toHaveLength(1)
    const analysis = analyzeSchematicPlacement(fallback, options)
    expect(analysis.getIssues()).toEqual(baseline.getIssues())
    expect(fallback).toEqual(original)
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: fallback,
        analysis,
        highlightIssues: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant.name)
  }
})
