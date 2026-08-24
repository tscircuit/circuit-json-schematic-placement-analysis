import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import type { SchematicPlacementAnalysis } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"

export function createSchematicAnalysisFixtureSvg(input: {
  circuitJson: AnyCircuitElement[]
  analysis?: SchematicPlacementAnalysis
  width?: number
  height?: number
}): string {
  const width = input.width ?? 1200
  const height = input.height ?? 600
  const analysis =
    input.analysis ?? analyzeSchematicPlacement(input.circuitJson)

  const circuitSvg = convertCircuitJsonToStackedSchematicSheetsSvg(
    input.circuitJson,
    {
      width,
      height,
    },
  )

  return formatFixtureSnapshotSvg(
    stackSvgsVertically(
      [circuitSvg, createAnalyzerTextSvg(analysis.toString(), width)],
      {
        normalizeSize: false,
        gap: 0,
        rootAttributes: {
          role: "img",
          "aria-label": "schematic analysis fixture",
        },
      },
    ),
  )
}

function createAnalyzerTextSvg(text: string, width: number): string {
  const lines = text
    ? text.split("\n").flatMap((line) => wrapLine(line, 96))
    : []
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
  ].join("\n")
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function wrapLine(line: string, maxLineLength: number): string[] {
  if (line.length <= maxLineLength) return [line]

  const wrappedLines: string[] = []
  let remainingLine = line

  while (remainingLine.length > maxLineLength) {
    const breakIndex = remainingLine.lastIndexOf(" ", maxLineLength)
    const splitIndex = breakIndex > 0 ? breakIndex : maxLineLength

    wrappedLines.push(remainingLine.slice(0, splitIndex))
    remainingLine = `  ${remainingLine.slice(splitIndex).trimStart()}`
  }

  wrappedLines.push(remainingLine)
  return wrappedLines
}

function formatFixtureSnapshotSvg(svg: string): string {
  return svg
    .replaceAll("</tspan><tspan", "</tspan>\n    <tspan")
    .replaceAll("\n<tspan", "\n    <tspan")
}
