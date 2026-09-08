import { createAnalyzerTextSvg } from "../../lib/svg/create-analyzer-text-svg"
export { createAnalyzerTextSvg } from "../../lib/svg/create-analyzer-text-svg"
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

function formatFixtureSnapshotSvg(svg: string): string {
  return svg
    .replaceAll("</tspan><tspan", "</tspan>\n    <tspan")
    .replaceAll("\n<tspan", "\n    <tspan")
}
