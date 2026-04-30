import type { CircuitJson, SchematicPort, SourcePort } from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxTooWide,
  SchematicBoxTooWideForChip,
  SchematicBoxTooWideForPinHeader,
} from "../types"

export const SCHEMATIC_BOX_SIZING_MESSAGE = "Shrink schematic box width"
export const PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP = 0.1
export const CHIP_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP = 1

const PIN_LABEL_EDGE_PADDING = 0.1
const PIN_NAME_CHARACTER_WIDTH = 0.095
const FALLBACK_CHARACTER_WIDTH = 0.13
const GAP_COMPARISON_EPSILON = 1e-9

type HorizontalSide = "left" | "right"

interface RectBounds {
  left: number
  right: number
}

interface LabelColumn {
  side: HorizontalSide
  labelCount: number
  maxLabelWidth: number
}

interface SourceComponentWithFtype {
  type: "source_component"
  source_component_id: string
  ftype?: string
}

interface SchematicBoxSizingCandidate {
  schematicBox: SchematicBoxPlacement
  sourceComponentFtype?: string
  measuredInnerLabelHorizontalEmptySpace: number
}

const isSchematicPort = (
  element: CircuitJson[number],
): element is SchematicPort => element.type === "schematic_port"

const isSourcePort = (element: CircuitJson[number]): element is SourcePort =>
  element.type === "source_port"

const getSourceComponentWithFtype = (
  element: CircuitJson[number],
): SourceComponentWithFtype | null => {
  if (
    element.type !== "source_component" ||
    !("source_component_id" in element) ||
    typeof element.source_component_id !== "string"
  ) {
    return null
  }

  return {
    type: "source_component",
    source_component_id: element.source_component_id,
    ftype:
      "ftype" in element && typeof element.ftype === "string"
        ? element.ftype
        : undefined,
  }
}

const isHorizontalSide = (
  side: SchematicPort["side_of_component"],
): side is HorizontalSide => side === "left" || side === "right"

const getCenteredRectBounds = (box: SchematicBoxPlacement): RectBounds => {
  const halfWidth = box.width / 2

  return {
    left: box.schX - halfWidth,
    right: box.schX + halfWidth,
  }
}

const isPinNameLabel = (
  label: string,
  sourcePort: SourcePort | undefined,
): boolean => {
  if (!sourcePort) return false

  return (
    label === sourcePort.name ||
    label === String(sourcePort.pin_number) ||
    (sourcePort.port_hints ?? []).includes(label)
  )
}

const estimateLabelWidth = (
  label: string,
  sourcePort: SourcePort | undefined,
): number => {
  const characterWidth = isPinNameLabel(label, sourcePort)
    ? PIN_NAME_CHARACTER_WIDTH
    : FALLBACK_CHARACTER_WIDTH

  return Array.from(label).length * characterWidth
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

const exceedsMaxAllowedGap = (
  measuredInnerLabelHorizontalEmptySpace: number,
  maxAllowedInnerLabelHorizontalEmptySpace: number,
): boolean =>
  measuredInnerLabelHorizontalEmptySpace -
    maxAllowedInnerLabelHorizontalEmptySpace >
  GAP_COMPARISON_EPSILON

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
  message: SCHEMATIC_BOX_SIZING_MESSAGE,
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
  message: SCHEMATIC_BOX_SIZING_MESSAGE,
})

const generateSchematicBoxSizingCandidates = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicBoxSizingCandidate[] => {
  const placementBySchematicComponentId = new Map(
    componentPlacements
      .filter((placement) => placement.schematicComponentId)
      .map((placement) => [placement.schematicComponentId!, placement]),
  )
  const sourcePortById = new Map(
    circuitJson
      .filter(isSourcePort)
      .map((sourcePort) => [sourcePort.source_port_id, sourcePort]),
  )
  const sourceComponentById = new Map(
    circuitJson
      .flatMap((element) => {
        const sourceComponent = getSourceComponentWithFtype(element)
        return sourceComponent ? [sourceComponent] : []
      })
      .map((sourceComponent) => [
        sourceComponent.source_component_id,
        sourceComponent,
      ]),
  )
  const portsBySchematicComponentId = new Map<string, SchematicPort[]>()

  for (const port of circuitJson.filter(isSchematicPort)) {
    if (!port.schematic_component_id) continue
    if (!isHorizontalSide(port.side_of_component)) continue

    const ports = portsBySchematicComponentId.get(port.schematic_component_id)
    if (ports) {
      ports.push(port)
    } else {
      portsBySchematicComponentId.set(port.schematic_component_id, [port])
    }
  }

  const candidates: SchematicBoxSizingCandidate[] = []

  for (const [schematicComponentId, ports] of portsBySchematicComponentId) {
    const schematicBox =
      placementBySchematicComponentId.get(schematicComponentId)
    if (!schematicBox) continue

    const bounds = getCenteredRectBounds(schematicBox)
    const leftLabelColumn = getLabelColumn("left", ports, sourcePortById)
    const rightLabelColumn = getLabelColumn("right", ports, sourcePortById)
    const sourceComponentFtype = schematicBox.sourceComponentId
      ? sourceComponentById.get(schematicBox.sourceComponentId)?.ftype
      : undefined

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

const getSchematicBoxTooWideForPinHeaderIssues = (
  candidates: SchematicBoxSizingCandidate[],
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

const getSchematicBoxTooWideForChipIssues = (
  candidates: SchematicBoxSizingCandidate[],
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
    generateSchematicBoxSizingCandidates(componentPlacements, circuitJson),
  )

export const generateSchematicBoxTooWideForChipIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicBoxTooWideForChip[] =>
  getSchematicBoxTooWideForChipIssues(
    generateSchematicBoxSizingCandidates(componentPlacements, circuitJson),
  )

export const generateSchematicBoxSizingIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicBoxTooWide[] => {
  const candidates = generateSchematicBoxSizingCandidates(
    componentPlacements,
    circuitJson,
  )

  return [
    ...getSchematicBoxTooWideForPinHeaderIssues(candidates),
    ...getSchematicBoxTooWideForChipIssues(candidates),
  ]
}
