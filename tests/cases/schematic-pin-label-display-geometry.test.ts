import { expect, test } from "bun:test"
import type { SchematicPort } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { parseSync } from "svgson"
import { analyzeSchematicPlacement } from "lib/index"
import {
  getSchematicPinLabelFontSize,
  getSchematicPinLabelText,
} from "lib/utils/schematic-box-labels"
import { createNearTouchingPinLabelsCircuitJson } from "../assets/near-touching-pin-labels"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("measures visible pin text with the renderer's font size and display syntax", async () => {
  const variants: Array<{
    name: string
    port: Partial<SchematicPort>
    displayedText: string
    fontSize: number
    collision: boolean
  }> = [
    {
      name: "plain",
      port: {},
      displayedText: "SOURCE",
      fontSize: 0.15,
      collision: true,
    },
    {
      name: "overlined",
      port: { display_pin_label: "N_SOURCE" },
      displayedText: "SOURCE",
      fontSize: 0.12,
      collision: false,
    },
    {
      name: "inversion-circle",
      port: { is_drawn_with_inversion_circle: true },
      displayedText: "SOURCE",
      fontSize: 0.12,
      collision: false,
    },
    {
      name: "explicit-small-font",
      port: { display_pin_label_font_size: 0.1 },
      displayedText: "SOURCE",
      fontSize: 0.1,
      collision: false,
    },
    {
      name: "explicit-overlined-font",
      port: {
        display_pin_label: "N_SOURCE",
        display_pin_label_font_size: 0.15,
      },
      displayedText: "SOURCE",
      fontSize: 0.15,
      collision: true,
    },
    {
      name: "text-parts",
      port: {
        display_pin_label: "A_LONG_RAW_LABEL",
        display_pin_label_text_parts: [{ text: "II", is_overlined: true }],
      },
      displayedText: "II",
      fontSize: 0.15,
      collision: false,
    },
    {
      name: "large-text-parts",
      port: {
        display_pin_label: "II",
        display_pin_label_text_parts: [
          { text: "SOU", is_overlined: true },
          { text: "RCE", is_overlined: false },
        ],
        display_pin_label_font_size: 0.3,
      },
      displayedText: "SOURCE",
      fontSize: 0.3,
      collision: true,
    },
  ]
  for (const variant of variants) {
    const circuitJson = await createNearTouchingPinLabelsCircuitJson({
      dimension: 1.3,
    })
    const port = circuitJson.find(
      (element) =>
        element.type === "schematic_port" &&
        element.display_pin_label === "SOURCE",
    )
    if (port?.type !== "schematic_port") throw Error("Missing SOURCE port")
    Object.assign(port, variant.port)
    expect(getSchematicPinLabelText(port)).toBe(variant.displayedText)
    expect(getSchematicPinLabelFontSize(port)).toBeCloseTo(variant.fontSize)
    const rendered = convertCircuitJsonToSchematicSvg(circuitJson)
    const nodes: ReturnType<typeof parseSync>[] = []
    const visit = (node: ReturnType<typeof parseSync>) => {
      if (node.attributes.class?.split(" ").includes("sch-pin-label"))
        nodes.push(node)
      for (const child of node.children) visit(child)
    }
    const textContent = (node: ReturnType<typeof parseSync>): string =>
      node.value + node.children.map(textContent).join("")
    visit(parseSync(rendered))
    const renderedLabel = nodes.find(
      (node) => textContent(node) === variant.displayedText,
    )
    expect(renderedLabel).toBeDefined()
    const scale = Number(
      rendered.match(/data-real-to-screen-transform="matrix\(([^,]+)/)![1],
    )
    expect(
      Number.parseFloat(renderedLabel!.attributes["font-size"]!) / scale,
    ).toBeCloseTo(variant.fontSize)
    const analysis = analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["SchematicBoxInnerLabelCollision"],
    })
    expect(analysis.getIssues()).toHaveLength(variant.collision ? 1 : 0)
    const svg = createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicBoxInnerLabelCollision"],
    })
    expect(svg).toMatchSvgSnapshot(import.meta.path, variant.name)
  }
})
