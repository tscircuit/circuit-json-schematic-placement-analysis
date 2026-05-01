import type { CircuitJson, SchematicPort, SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxTooWideForChip,
  SchematicBoxTooWideForPinHeader,
} from "../../types"
import {
  CHIP_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  PIN_LABEL_EDGE_PADDING,
  SCHEMATIC_BOX_TOO_WIDE_MESSAGE,
  type HorizontalSide,
  type RectBounds,
  exceedsMaxAllowedGap,
  estimateLabelWidth,
  getCenteredRectBounds,
  getPlacementBySchematicComponentId,
  getPortsBySchematicComponentId,
  getSourceComponentById,
  getSourceComponentFtype,
  getSourcePortById,
  isHorizontalSide,
} from "./shared"

interface LabelColumn {
  side: HorizontalSide
  labelCount: number
  maxLabelWidth: number
}

interface SchematicBoxWidthSizingCandidate {
  schematicBox: SchematicBoxPlacement
  sourceComponentFtype?: string
  measuredInnerLabelHorizontalEmptySpace: number
}

const getLabelColumn = (
  side: HorizontalSide,
  ports: SchematicPort[],
  sourcePortById: Map<string, SourcePort>,
): LabelColumn | null => {
  const labelWidths = ports
    .filter((port) => port.side_of_component === side)
    .flatMap((port) =>
      port.display_pin_label
        ? [
            estimateLabelWidth(
              port.display_pin_label,
              sourcePortById.get(port.source_port_id),
            ),
          ]
        : [],
    )

  if (labelWidths.length === 0) return null

  return {
    side,
    labelCount: labelWidths.length,
    maxLabelWidth: Math.max(...labelWidths),
  }
}

const getInnerLabelEdge = (
  bounds: RectBounds,
  labelColumn: LabelColumn,
): number => {
  if (labelColumn.side === "left") {
    return bounds.left + PIN_LABEL_EDGE_PADDING + labelColumn.maxLabelWidth
  }

  return bounds.right - PIN_LABEL_EDGE_PADDING - labelColumn.maxLabelWidth
}

const getSuggestedWidth = (input: {
  measuredInnerLabelHorizontalEmptySpace: number
  maxAllowedInnerLabelHorizontalEmptySpace: number
  currentWidth: number
}): number =>
  input.currentWidth -
  input.measuredInnerLabelHorizontalEmptySpace +
  input.maxAllowedInnerLabelHorizontalEmptySpace

const createPinHeaderIssue = (input: {
  schematicBox: SchematicBoxPlacement
  measuredInnerLabelHorizontalEmptySpace: number
  suggestedSchWidth: number
}): SchematicBoxTooWideForPinHeader => ({
  lineItemType: "SchematicBoxTooWideForPinHeader",
  schematicBox: input.schematicBox,
  measuredInnerLabelHorizontalEmptySpace:
    input.measuredInnerLabelHorizontalEmptySpace,
  maxAllowedInnerLabelHorizontalEmptySpace:
    PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  suggestedSchWidth: input.suggestedSchWidth,
  message: SCHEMATIC_BOX_TOO_WIDE_MESSAGE,
})

const createChipIssue = (input: {
  schematicBox: SchematicBoxPlacement
  measuredInnerLabelHorizontalEmptySpace: number
  suggestedSchWidth: number
}): SchematicBoxTooWideForChip => ({
  lineItemType: "SchematicBoxTooWideForChip",
  schematicBox: input.schematicBox,
  measuredInnerLabelHorizontalEmptySpace:
    input.measuredInnerLabelHorizontalEmptySpace,
  maxAllowedInnerLabelHorizontalEmptySpace:
    CHIP_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
  suggestedSchWidth: input.suggestedSchWidth,
  message: SCHEMATIC_BOX_TOO_WIDE_MESSAGE,
})

export const generateSchematicBoxWidthSizingCandidates = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicBoxWidthSizingCandidate[] => {
  const placementBySchematicComponentId =
    getPlacementBySchematicComponentId(componentPlacements)
  const sourcePortById = getSourcePortById(circuitJson)
  const sourceComponentById = getSourceComponentById(circuitJson)
  const portsBySchematicComponentId = getPortsBySchematicComponentId(
    circuitJson,
    isHorizontalSide,
  )

  const candidates: SchematicBoxWidthSizingCandidate[] = []

  for (const [schematicComponentId, ports] of portsBySchematicComponentId) {
    const schematicBox =
      placementBySchematicComponentId.get(schematicComponentId)
    if (!schematicBox) continue

    const bounds = getCenteredRectBounds(schematicBox)
    const leftLabelColumn = getLabelColumn("left", ports, sourcePortById)
    const rightLabelColumn = getLabelColumn("right", ports, sourcePortById)
    const sourceComponentFtype = getSourceComponentFtype(
      schematicBox,
      sourceComponentById,
    )

    if (leftLabelColumn && rightLabelColumn) {
      const measuredInnerLabelHorizontalEmptySpace =
        getInnerLabelEdge(bounds, rightLabelColumn) -
        getInnerLabelEdge(bounds, leftLabelColumn)

      candidates.push({
        schematicBox,
        sourceComponentFtype,
        measuredInnerLabelHorizontalEmptySpace,
      })

      continue
    }

    if (leftLabelColumn && leftLabelColumn.labelCount >= 4) {
      const measuredInnerLabelHorizontalEmptySpace =
        bounds.right - getInnerLabelEdge(bounds, leftLabelColumn)

      candidates.push({
        schematicBox,
        sourceComponentFtype,
        measuredInnerLabelHorizontalEmptySpace,
      })
    }

    if (rightLabelColumn && rightLabelColumn.labelCount >= 4) {
      const measuredInnerLabelHorizontalEmptySpace =
        getInnerLabelEdge(bounds, rightLabelColumn) - bounds.left

      candidates.push({
        schematicBox,
        sourceComponentFtype,
        measuredInnerLabelHorizontalEmptySpace,
      })
    }
  }

  return candidates
}

export const getSchematicBoxTooWideForPinHeaderIssues = (
  candidates: SchematicBoxWidthSizingCandidate[],
): SchematicBoxTooWideForPinHeader[] =>
  candidates
    .filter(
      (candidate) => candidate.sourceComponentFtype === "simple_pin_header",
    )
    .filter((candidate) =>
      exceedsMaxAllowedGap(
        candidate.measuredInnerLabelHorizontalEmptySpace,
        PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
      ),
    )
    .map((candidate) =>
      createPinHeaderIssue({
        schematicBox: candidate.schematicBox,
        measuredInnerLabelHorizontalEmptySpace:
          candidate.measuredInnerLabelHorizontalEmptySpace,
        suggestedSchWidth: getSuggestedWidth({
          measuredInnerLabelHorizontalEmptySpace:
            candidate.measuredInnerLabelHorizontalEmptySpace,
          maxAllowedInnerLabelHorizontalEmptySpace:
            PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
          currentWidth: candidate.schematicBox.width,
        }),
      }),
    )

export const getSchematicBoxTooWideForChipIssues = (
  candidates: SchematicBoxWidthSizingCandidate[],
): SchematicBoxTooWideForChip[] =>
  candidates
    .filter((candidate) => candidate.sourceComponentFtype === "simple_chip")
    .filter((candidate) =>
      exceedsMaxAllowedGap(
        candidate.measuredInnerLabelHorizontalEmptySpace,
        CHIP_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
      ),
    )
    .map((candidate) =>
      createChipIssue({
        schematicBox: candidate.schematicBox,
        measuredInnerLabelHorizontalEmptySpace:
          candidate.measuredInnerLabelHorizontalEmptySpace,
        suggestedSchWidth: getSuggestedWidth({
          measuredInnerLabelHorizontalEmptySpace:
            candidate.measuredInnerLabelHorizontalEmptySpace,
          maxAllowedInnerLabelHorizontalEmptySpace:
            CHIP_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP,
          currentWidth: candidate.schematicBox.width,
        }),
      }),
    )

export const generateSchematicBoxTooWideForPinHeaderIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicBoxTooWideForPinHeader[] =>
  getSchematicBoxTooWideForPinHeaderIssues(
    generateSchematicBoxWidthSizingCandidates(componentPlacements, circuitJson),
  )

export const generateSchematicBoxTooWideForChipIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicBoxTooWideForChip[] =>
  getSchematicBoxTooWideForChipIssues(
    generateSchematicBoxWidthSizingCandidates(componentPlacements, circuitJson),
  )
