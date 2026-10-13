import { expect, test } from "bun:test"
import type { SchematicPort } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPinLabelContainmentCircuitJson } from "../assets/pin-label-containment"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("uses displayed text and font size, accepting exact containment with floating-point tolerance", async () => {
  const variants: Array<{
    name: string
    height: number
    width?: number
    patch?: Partial<SchematicPort>
    count: number
  }> = [
    { name: "on-edge", height: 0.35, count: 0 },
    { name: "roundoff", height: 0.35 - 1e-10, count: 0 },
    { name: "outside", height: 0.35 - 1e-5, count: 1 },
    { name: "contained", height: 0.351, count: 0 },
    {
      name: "large-font",
      height: 0.35,
      patch: { display_pin_label_font_size: 0.3 },
      count: 1,
    },
    {
      name: "small-overlined",
      height: 0.32,
      patch: { display_pin_label: "N_A" },
      count: 0,
    },
    {
      name: "small-inverted",
      height: 0.32,
      patch: { is_drawn_with_inversion_circle: true },
      count: 0,
    },
    {
      name: "text-parts",
      height: 0.35,
      width: 0.4,
      patch: {
        display_pin_label: "LONG_RAW_LABEL",
        display_pin_label_text_parts: [{ text: "I" }],
      },
      count: 0,
    },
    {
      name: "long-text-parts",
      height: 0.35,
      width: 0.4,
      patch: {
        display_pin_label_text_parts: [
          { text: "LONG", is_overlined: true },
          { text: "_LABEL" },
        ],
      },
      count: 1,
    },
  ]
  for (const variant of variants) {
    const circuitJson = await createPinLabelContainmentCircuitJson({
      side: "left",
      height: variant.height,
      width: variant.width,
    })
    for (const port of circuitJson.filter((e) => e.type === "schematic_port"))
      Object.assign(port, variant.patch)
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SchematicBoxInnerLabelOutOfBounds"],
    })
    expect(analysis.getIssues()).toHaveLength(variant.count)
    if (variant.count) {
      const issue = analysis.getIssues()[0]!
      if (issue.lineItemType !== "SchematicBoxInnerLabelOutOfBounds")
        throw Error()
      expect(issue.overflowingLabels).toHaveLength(2)
      expect(issue.overflowingLabels[0]!.text).toBe(
        variant.name === "long-text-parts" ? "LONG_LABEL" : "A",
      )
    }
    if (
      ["on-edge", "large-font", "long-text-parts", "text-parts"].includes(
        variant.name,
      )
    ) {
      expect(
        createSchematicAnalysisFixtureSvg({
          circuitJson,
          analysis,
          highlightIssues: true,
        }),
      ).toMatchSvgSnapshot(import.meta.path, variant.name)
    }
  }
})
