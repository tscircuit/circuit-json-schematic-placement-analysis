import type {
  CircuitJson,
  SchematicComponent,
  SchematicPort,
  SourcePort,
} from "circuit-json"
import type { SchematicBoxPlacement } from "../../types"

export const SCHEMATIC_BOX_TOO_WIDE_MESSAGE = "Shrink schematic box width"
export const SCHEMATIC_PIN_PADDING_TO_EDGE_TOO_LARGE_MESSAGE =
  "Move schematic pins closer to the box edge or change the schematic box"
export const PIN_HEADER_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP = 0.1
export const CHIP_SCHEMATIC_BOX_SIZING_MAX_ALLOWED_GAP = 1

export const PIN_LABEL_EDGE_PADDING = 0.1
const PIN_NAME_CHARACTER_WIDTH = 0.095
const FALLBACK_CHARACTER_WIDTH = 0.13
const PIN_LABEL_TEXT_HEIGHT = PIN_NAME_CHARACTER_WIDTH
const GAP_COMPARISON_EPSILON = 1e-9

export type HorizontalSide = "left" | "right"
export type VerticalSide = "top" | "bottom"

export interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export interface SourceComponentWithFtype {
  type: "source_component"
  source_component_id: string
  ftype?: string
}

export const isSchematicPort = (
  element: CircuitJson[number],
): element is SchematicPort => element.type === "schematic_port"

export const isSourcePort = (
  element: CircuitJson[number],
): element is SourcePort => element.type === "source_port"

export const isSchematicComponent = (
  element: CircuitJson[number],
): element is SchematicComponent => element.type === "schematic_component"

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

export const isHorizontalSide = (
  side: SchematicPort["side_of_component"],
): side is HorizontalSide => side === "left" || side === "right"

export const isVerticalSide = (
  side: SchematicPort["side_of_component"],
): side is VerticalSide => side === "top" || side === "bottom"

export const getCenteredRectBounds = (
  box: SchematicBoxPlacement,
): RectBounds => {
  const halfWidth = box.width / 2
  const halfHeight = box.height / 2

  return {
    left: box.schX - halfWidth,
    right: box.schX + halfWidth,
    top: box.schY + halfHeight,
    bottom: box.schY - halfHeight,
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

export const estimateLabelWidth = (
  label: string,
  sourcePort: SourcePort | undefined,
): number => {
  const characterWidth = isPinNameLabel(label, sourcePort)
    ? PIN_NAME_CHARACTER_WIDTH
    : FALLBACK_CHARACTER_WIDTH

  return Array.from(label).length * characterWidth
}

export const estimateLabelHeight = (
  label: string,
  sourcePort: SourcePort | undefined,
): number =>
  isPinNameLabel(label, sourcePort)
    ? PIN_LABEL_TEXT_HEIGHT
    : FALLBACK_CHARACTER_WIDTH

export const exceedsMaxAllowedGap = (
  measuredInnerLabelEmptySpace: number,
  maxAllowedInnerLabelEmptySpace: number,
): boolean =>
  measuredInnerLabelEmptySpace - maxAllowedInnerLabelEmptySpace >
  GAP_COMPARISON_EPSILON

export const getSourcePortById = (
  circuitJson: CircuitJson,
): Map<string, SourcePort> =>
  new Map(
    circuitJson
      .filter(isSourcePort)
      .map((sourcePort) => [sourcePort.source_port_id, sourcePort]),
  )

export const getSourceComponentById = (
  circuitJson: CircuitJson,
): Map<string, SourceComponentWithFtype> =>
  new Map(
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

export const getSchematicComponentById = (
  circuitJson: CircuitJson,
): Map<string, SchematicComponent> =>
  new Map(
    circuitJson
      .filter(isSchematicComponent)
      .map((schematicComponent) => [
        schematicComponent.schematic_component_id,
        schematicComponent,
      ]),
  )

export const getPlacementBySchematicComponentId = (
  componentPlacements: SchematicBoxPlacement[],
): Map<string, SchematicBoxPlacement> =>
  new Map(
    componentPlacements
      .filter((placement) => placement.schematicComponentId)
      .map((placement) => [placement.schematicComponentId!, placement]),
  )

export const getPortsBySchematicComponentId = (
  circuitJson: CircuitJson,
  isRelevantSide: (
    side: SchematicPort["side_of_component"],
  ) => side is HorizontalSide | VerticalSide,
): Map<string, SchematicPort[]> => {
  const portsBySchematicComponentId = new Map<string, SchematicPort[]>()

  for (const port of circuitJson.filter(isSchematicPort)) {
    if (!port.schematic_component_id) continue
    if (!isRelevantSide(port.side_of_component)) continue

    const ports = portsBySchematicComponentId.get(port.schematic_component_id)
    if (ports) {
      ports.push(port)
    } else {
      portsBySchematicComponentId.set(port.schematic_component_id, [port])
    }
  }

  return portsBySchematicComponentId
}

export const getSourceComponentFtype = (
  schematicBox: SchematicBoxPlacement,
  sourceComponentById: Map<string, SourceComponentWithFtype>,
): string | undefined =>
  schematicBox.sourceComponentId
    ? sourceComponentById.get(schematicBox.sourceComponentId)?.ftype
    : undefined
