import type {
  CircuitJson,
  SchematicComponent,
  SchematicPort,
  SourcePort,
} from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicPinPaddingToEdgeTooLarge,
  SchematicSide,
} from "../../types"
import {
  SCHEMATIC_PIN_PADDING_TO_EDGE_TOO_LARGE_MESSAGE,
  estimateLabelWidth,
  exceedsMaxAllowedGap,
  getCenteredRectBounds,
  getPlacementBySchematicComponentId,
  getPortsBySchematicComponentId,
  getSchematicComponentById,
  getSourcePortById,
  isHorizontalSide,
  isVerticalSide,
} from "./shared"

interface PinPaddingToEdgeCandidate {
  schematicBox: SchematicBoxPlacement
  pinSide: SchematicSide
  edgeSide: SchematicSide
  pinName?: string
  measuredPadding: number
  maxAllowedPadding: number
}

interface MeasuredPinPadding {
  pinName?: string
  measuredPadding: number
}

type MaxLabelLengthBySide = Record<SchematicSide, number>

const isSchematicSide = (
  side: SchematicPort["side_of_component"],
): side is SchematicSide => isHorizontalSide(side) || isVerticalSide(side)

const getPinSpacing = (
  schematicBox: SchematicBoxPlacement,
  schematicComponentById: Map<string, SchematicComponent>,
): number | null => {
  if (!schematicBox.schematicComponentId) return null

  const schematicComponent = schematicComponentById.get(
    schematicBox.schematicComponentId,
  )

  return typeof schematicComponent?.pin_spacing === "number"
    ? schematicComponent.pin_spacing
    : null
}

const getPinName = (
  port: SchematicPort,
  sourcePortById: Map<string, SourcePort>,
): string | undefined => {
  const sourcePort = sourcePortById.get(port.source_port_id)

  if (sourcePort?.name) return sourcePort.name
  if (port.display_pin_label) return port.display_pin_label
  if (sourcePort?.pin_number !== undefined) return String(sourcePort.pin_number)

  return undefined
}

const getMaxLabelLengthBySide = (
  ports: SchematicPort[],
  sourcePortById: Map<string, SourcePort>,
): MaxLabelLengthBySide => {
  const maxLabelLengthBySide: MaxLabelLengthBySide = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  }

  for (const port of ports) {
    if (!isSchematicSide(port.side_of_component)) continue
    if (!port.display_pin_label) continue

    maxLabelLengthBySide[port.side_of_component] = Math.max(
      maxLabelLengthBySide[port.side_of_component],
      estimateLabelWidth(
        port.display_pin_label,
        sourcePortById.get(port.source_port_id),
      ),
    )
  }

  return maxLabelLengthBySide
}

const getOuterPinBySide = (
  edgeSide: SchematicSide,
  ports: SchematicPort[],
): SchematicPort | null => {
  if (ports.length === 0) return null

  switch (edgeSide) {
    case "top":
      return ports.reduce((topPort, port) =>
        port.center.y > topPort.center.y ? port : topPort,
      )
    case "bottom":
      return ports.reduce((bottomPort, port) =>
        port.center.y < bottomPort.center.y ? port : bottomPort,
      )
    case "left":
      return ports.reduce((leftPort, port) =>
        port.center.x < leftPort.center.x ? port : leftPort,
      )
    case "right":
      return ports.reduce((rightPort, port) =>
        port.center.x > rightPort.center.x ? port : rightPort,
      )
  }
}

const getPinPaddingToEdge = (input: {
  schematicBox: SchematicBoxPlacement
  port: SchematicPort
  edgeSide: SchematicSide
}): number => {
  const bounds = getCenteredRectBounds(input.schematicBox)

  switch (input.edgeSide) {
    case "top":
      return Math.max(0, bounds.top - input.port.center.y)
    case "bottom":
      return Math.max(0, input.port.center.y - bounds.bottom)
    case "left":
      return Math.max(0, input.port.center.x - bounds.left)
    case "right":
      return Math.max(0, bounds.right - input.port.center.x)
  }
}

const getBoxEdgeSidesForPinSide = (
  pinSide: SchematicSide,
): [SchematicSide, SchematicSide] =>
  isHorizontalSide(pinSide) ? ["top", "bottom"] : ["left", "right"]

const hasPinsOnAllSides = (
  portsBySide: Map<SchematicSide, SchematicPort[]>,
): boolean =>
  portsBySide.has("left") &&
  portsBySide.has("right") &&
  portsBySide.has("top") &&
  portsBySide.has("bottom")

const getMaxAllowedPinPadding = (input: {
  spacing: number
  edgeSide: SchematicSide
  maxLabelLengthBySide: MaxLabelLengthBySide
}): number => {
  const edgeAxisSides: [SchematicSide, SchematicSide] = isHorizontalSide(
    input.edgeSide,
  )
    ? ["left", "right"]
    : ["top", "bottom"]

  return (
    (input.maxLabelLengthBySide[edgeAxisSides[0]] +
      input.maxLabelLengthBySide[edgeAxisSides[1]] +
      input.spacing) /
    2
  )
}

const createPinPaddingToEdgeIssue = (
  candidate: PinPaddingToEdgeCandidate,
): SchematicPinPaddingToEdgeTooLarge => ({
  lineItemType: "SchematicPinPaddingToEdgeTooLarge",
  pinSide: candidate.pinSide,
  edgeSide: candidate.edgeSide,
  pinName: candidate.pinName,
  schematicBox: candidate.schematicBox,
  measuredPadding: candidate.measuredPadding,
  maxAllowedPadding: candidate.maxAllowedPadding,
  message: isHorizontalSide(candidate.pinSide)
    ? `${SCHEMATIC_PIN_PADDING_TO_EDGE_TOO_LARGE_MESSAGE} height`
    : `${SCHEMATIC_PIN_PADDING_TO_EDGE_TOO_LARGE_MESSAGE} width`,
})

export const generateSchematicPinPaddingToEdgeCandidates = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): PinPaddingToEdgeCandidate[] => {
  const placementBySchematicComponentId =
    getPlacementBySchematicComponentId(componentPlacements)
  const schematicComponentById = getSchematicComponentById(circuitJson)
  const sourcePortById = getSourcePortById(circuitJson)
  const portsBySchematicComponentId = getPortsBySchematicComponentId(
    circuitJson,
    isSchematicSide,
  )

  const candidates: PinPaddingToEdgeCandidate[] = []

  for (const [schematicComponentId, ports] of portsBySchematicComponentId) {
    const schematicBox =
      placementBySchematicComponentId.get(schematicComponentId)
    if (!schematicBox) continue

    const pinSpacing = getPinSpacing(schematicBox, schematicComponentById)
    if (pinSpacing === null) continue

    const maxLabelLengthBySide = getMaxLabelLengthBySide(ports, sourcePortById)

    const portsBySide = new Map<SchematicSide, SchematicPort[]>()

    for (const port of ports) {
      if (!isSchematicSide(port.side_of_component)) continue

      const sidePorts = portsBySide.get(port.side_of_component) ?? []
      sidePorts.push(port)
      portsBySide.set(port.side_of_component, sidePorts)
    }

    const useLabelAwareMaxPadding = hasPinsOnAllSides(portsBySide)

    for (const [pinSide, sidePorts] of portsBySide) {
      for (const edgeSide of getBoxEdgeSidesForPinSide(pinSide)) {
        const outerPin = getOuterPinBySide(edgeSide, sidePorts)
        if (!outerPin) continue

        const measuredPinPadding: MeasuredPinPadding = {
          pinName: getPinName(outerPin, sourcePortById),
          measuredPadding: getPinPaddingToEdge({
            schematicBox,
            port: outerPin,
            edgeSide,
          }),
        }

        candidates.push({
          schematicBox,
          pinSide,
          edgeSide,
          pinName: measuredPinPadding.pinName,
          measuredPadding: measuredPinPadding.measuredPadding,
          maxAllowedPadding: useLabelAwareMaxPadding
            ? getMaxAllowedPinPadding({
                spacing: pinSpacing,
                edgeSide,
                maxLabelLengthBySide,
              })
            : pinSpacing,
        })
      }
    }
  }

  return candidates
}

export const getSchematicPinPaddingToEdgeTooLargeIssues = (
  candidates: PinPaddingToEdgeCandidate[],
): SchematicPinPaddingToEdgeTooLarge[] =>
  candidates
    .filter((candidate) =>
      exceedsMaxAllowedGap(
        candidate.measuredPadding,
        candidate.maxAllowedPadding,
      ),
    )
    .map(createPinPaddingToEdgeIssue)

export const generateSchematicPinPaddingToEdgeTooLargeIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): SchematicPinPaddingToEdgeTooLarge[] =>
  getSchematicPinPaddingToEdgeTooLargeIssues(
    generateSchematicPinPaddingToEdgeCandidates(
      componentPlacements,
      circuitJson,
    ),
  )
