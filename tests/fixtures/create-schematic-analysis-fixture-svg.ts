import {
  createAnalyzerTextSvg,
  type AnalyzerTextIssueMarker,
} from "../../lib/svg/create-analyzer-text-svg"
export { createAnalyzerTextSvg } from "../../lib/svg/create-analyzer-text-svg"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "circuit-to-svg"
import { analyzeSchematicPlacement } from "lib/index"
import type { SchematicPlacementAnalysis } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { SchematicPlacementIssue } from "lib/types"
import { addSchematicIssueHighlights } from "./add-schematic-issue-highlights"

export function createSchematicAnalysisFixtureSvg(input: {
  circuitJson: AnyCircuitElement[]
  analysis?: SchematicPlacementAnalysis
  width?: number
  height?: number
  /** Highlight all issues, or only these types; add matching numbers beside the listing. */
  highlightIssues?: boolean | SchematicPlacementIssue["lineItemType"][]
}): string {
  const width = input.width ?? 1200
  const height = input.height ?? 600
  const analysis =
    input.analysis ?? analyzeSchematicPlacement(input.circuitJson)

  let circuitSvg = convertCircuitJsonToStackedSchematicSheetsSvg(
    input.circuitJson,
    {
      width,
      height,
    },
  )

  let markers: AnalyzerTextIssueMarker[] = []
  if (input.highlightIssues) {
    const highlighted = addSchematicIssueHighlights({
      svg: circuitSvg,
      circuitJson: input.circuitJson,
      analysis,
      issueTypes: Array.isArray(input.highlightIssues)
        ? input.highlightIssues
        : undefined,
    })
    circuitSvg = highlighted.svg
    markers = highlighted.highlights.map(({ number, issue, sheetId }) => ({
      number,
      text: analysis.schematicIssuesToString(issue),
      sheetId,
    }))
  }

  return formatFixtureSnapshotSvg(
    stackSvgsVertically(
      [circuitSvg, createAnalyzerTextSvg(analysis.toString(), width, markers)],
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
