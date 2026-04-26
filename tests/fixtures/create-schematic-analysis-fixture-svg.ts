import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { stackSvgsVertically } from "stack-svgs"
import { SchematicPlacementAnalyzer } from "../../src"

export function createSchematicAnalysisFixtureSvg(input: {
  circuitJson: AnyCircuitElement[]
  analyzer?: SchematicPlacementAnalyzer
  width?: number
  height?: number
}): string {
  const width = input.width ?? 1200
  const height = input.height ?? 600
  const analyzer =
    input.analyzer ?? new SchematicPlacementAnalyzer(input.circuitJson)

  const circuitSvg = convertCircuitJsonToSchematicSvg(input.circuitJson, {
    width,
    height,
  })

  return stackSvgsVertically(
    [circuitSvg, createAnalyzerTextSvg(analyzer.toString(), width)],
    {
      normalizeSize: false,
      gap: 0,
      rootAttributes: {
        role: "img",
        "aria-label": "schematic analysis fixture",
      },
    },
  )
}

function createAnalyzerTextSvg(text: string, width: number): string {
  const lines = text.split("\n")
  const lineHeight = 22
  const padding = 18
  const height = padding * 2 + lines.length * lineHeight

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#fff" />`,
    `<text x="${padding}" y="${padding + lineHeight}" fill="#d00" font-family="Menlo, Consolas, monospace" font-size="16">`,
    ...lines.map(
      (line, index) =>
        `<tspan x="${padding}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    ),
    "</text>",
    "</svg>",
  ].join("")
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}
