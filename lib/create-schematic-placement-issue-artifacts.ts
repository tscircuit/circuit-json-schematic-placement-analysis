import type { CircuitJson } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import {
  analyzeSchematicPlacement,
  type SchematicPlacementAnalysis,
} from "./analyze-schematic-placement"
import type { SchematicIssueBounds, SchematicPlacementIssue } from "./types"
import { renderIssueOverlay } from "./svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "./svg/create-analyzer-text-svg"
import { getIssueSchematicSheetContext } from "./utils/issue-context"
import { escapeAttr } from "./utils/format"

export interface SchematicPlacementIssueArtifact {
  /** Stable within this analysis, even when filtering the returned artifacts. */
  issueIndex: number
  issue: SchematicPlacementIssue
  schematicSheetId?: string
  /** Unpadded issue geometry and involved component bounds; schematic units, Y up. */
  bounds?: SchematicIssueBounds
  descriptionXml: string
  fileName: string
  contentType: "image/svg+xml"
  /** A cropped schematic with just this issue's overlay and its XML underneath. */
  content: string
}

export interface SchematicPlacementIssueArtifactOptions {
  /** Reuse an analysis of the same circuit to avoid running the solvers again. */
  analysis?: SchematicPlacementAnalysis
  issueTypes?: readonly SchematicPlacementIssue["lineItemType"][]
  schematicSheetId?: string
  /** Width and height of the schematic panel; the XML panel adds to total height. */
  width?: number
  height?: number
}

/** Create one self-contained SVG per emitted issue, without filesystem access.
 * No issues (or no filter matches) returns []. Other issues' overlays, counts,
 * and XML are excluded; surrounding schematic elements remain as context. */
export function createSchematicPlacementIssueArtifacts(
  circuitJson: CircuitJson,
  options: SchematicPlacementIssueArtifactOptions = {},
): SchematicPlacementIssueArtifact[] {
  const width = options.width ?? 1400
  const height = options.height ?? 900
  if (
    !Number.isFinite(width) ||
    width < 320 ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new Error(
      "Artifact width must be at least 320 and height must be positive (finite pixels)",
    )
  }
  const analysis = options.analysis ?? analyzeSchematicPlacement(circuitJson)
  const allIssues = analysis.getIssues()
  return analysis.getIssues(options).map((issue) => {
    const issueIndex = allIssues.indexOf(issue)
    const { schematicSheetId } = getIssueSchematicSheetContext(issue)
    const { svg, bounds } = renderIssueOverlay({
      circuitJson,
      analysis,
      issueIndex,
      schematicSheetId: schematicSheetId ?? "",
      width,
      height,
    })
    const descriptionXml =
      analysis.schematicIssuesToString(issue) ||
      `<${issue.lineItemType} details="${escapeAttr(JSON.stringify(issue))}" />`
    const content = stackSvgsVertically(
      [
        // Nest the SVG to preserve its cropped viewBox and clip at the panel edge.
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svg}</svg>`,
        createAnalyzerTextSvg(descriptionXml, width),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, "")
    return {
      issueIndex,
      issue,
      schematicSheetId,
      bounds,
      descriptionXml,
      fileName: `issue-${String(issueIndex + 1).padStart(4, "0")}-${issue.lineItemType}.svg`,
      contentType: "image/svg+xml",
      content,
    }
  })
}
