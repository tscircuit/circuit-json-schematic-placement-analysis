import { expect, test } from "bun:test"
import type { SchematicPort } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import { withComponentPinLabels } from "../assets/component-pin-labels"
import { createPinLabelContainmentCircuitJson } from "../assets/pin-label-containment"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("component fallback labels have the same containment geometry as explicit labels", async () => {
  const variants: Array<{
    name: string
    label: string
    width: number
    height: number
    overflow: boolean
    patch?: Partial<SchematicPort>
  }> = [
    {
      name: "plain",
      label: "LONG_LABEL",
      width: 0.4,
      height: 1,
      overflow: true,
    },
    {
      name: "overlined",
      label: "N_A",
      width: 2,
      height: 0.13,
      overflow: false,
    },
    {
      name: "short-text-parts",
      label: "LONG_RAW_LABEL",
      width: 0.4,
      height: 1,
      overflow: false,
      patch: {
        display_pin_label_text_parts: [{ text: "I", is_overlined: true }],
      },
    },
    {
      name: "long-text-parts",
      label: "A",
      width: 0.4,
      height: 1,
      overflow: true,
      patch: { display_pin_label_text_parts: [{ text: "LONG_LABEL" }] },
    },
    {
      name: "font-override",
      label: "A",
      width: 2,
      height: 0.25,
      overflow: true,
      patch: { display_pin_label_font_size: 0.3 },
    },
    {
      name: "inversion-circle",
      label: "A",
      width: 2,
      height: 0.13,
      overflow: false,
      patch: { is_drawn_with_inversion_circle: true },
    },
    {
      name: "explicit-override",
      label: "LONG_COMPONENT_LABEL",
      width: 0.4,
      height: 1,
      overflow: false,
      patch: { display_pin_label: "I" },
    },
    {
      name: "explicit-empty",
      label: "LONG_COMPONENT_LABEL",
      width: 0.4,
      height: 1,
      overflow: false,
      patch: {
        display_pin_label: "",
        display_pin_label_text_parts: [{ text: "HIDDEN_TEXT" }],
      },
    },
  ]
  for (const side of ["left", "right", "top", "bottom"] as const) {
    for (const variant of variants) {
      if (side !== "left" && variant.name !== "plain") continue
      const horizontal = side === "left" || side === "right"
      const explicit = await createPinLabelContainmentCircuitJson({
        side,
        width: horizontal ? variant.width : variant.height,
        height: horizontal ? variant.height : variant.width,
        labels: [variant.label],
      })
      const fallback = withComponentPinLabels(explicit)
      for (const circuitJson of [explicit, fallback])
        for (const port of circuitJson.filter(
          (e) => e.type === "schematic_port",
        ))
          Object.assign(port, variant.patch)
      const original = structuredClone(fallback)
      expect(
        convertCircuitJsonToSchematicSvg(fallback) ===
          convertCircuitJsonToSchematicSvg(explicit),
      ).toBe(true)
      const options = {
        issueTypes: ["SchematicBoxInnerLabelOutOfBounds"],
      } as const
      const baseline = analyzeSchematicPlacement(explicit, options)
      expect(baseline.getIssues()).toHaveLength(variant.overflow ? 1 : 0)
      const analysis = analyzeSchematicPlacement(fallback, options)
      expect(analysis.getIssues()).toEqual(baseline.getIssues())
      expect(fallback).toEqual(original)
      expect(
        createSchematicAnalysisFixtureSvg({
          circuitJson: fallback,
          analysis,
          highlightIssues: true,
        }),
      ).toMatchSvgSnapshot(import.meta.path, `${side}-${variant.name}`)
    }
  }
})
