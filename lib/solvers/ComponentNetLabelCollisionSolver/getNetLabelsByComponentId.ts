import { pointToSegmentDistance } from "@tscircuit/math-utils"
import type {
  CircuitJson,
  SchematicNetLabel,
  SchematicPort,
  SchematicTrace,
} from "circuit-json"

type SchematicComponentId = string

interface PortPosition {
  schematicComponentId: SchematicComponentId
  center: { x: number; y: number }
  schematicSheetId?: string
}

const POSITION_MATCH_EPSILON = 1e-4

const positionsMatch = (
  firstPosition: { x: number; y: number },
  secondPosition: { x: number; y: number },
): boolean =>
  Math.hypot(
    firstPosition.x - secondPosition.x,
    firstPosition.y - secondPosition.y,
  ) < POSITION_MATCH_EPSILON

const getPortsConnectedToLabel = ({
  label,
  portPositions,
  schematicTraces,
}: {
  label: SchematicNetLabel
  portPositions: PortPosition[]
  schematicTraces: SchematicTrace[]
}): PortPosition[] => {
  const anchorPosition = label.anchor_position
  if (!anchorPosition) return []

  const portsAtAnchor = portPositions.filter(
    (port) =>
      port.schematicSheetId === label.schematic_sheet_id &&
      positionsMatch(port.center, anchorPosition),
  )
  if (portsAtAnchor.length > 0) return portsAtAnchor

  const connectedTraceEndpoints = schematicTraces
    .filter(
      (trace) =>
        trace.schematic_sheet_id === label.schematic_sheet_id &&
        (trace.schematic_trace_id === label.schematic_trace_id ||
          trace.edges.some(
            (edge) =>
              pointToSegmentDistance(anchorPosition, edge.from, edge.to) <
              POSITION_MATCH_EPSILON,
          )),
    )
    .flatMap((trace) => trace.edges.flatMap((edge) => [edge.from, edge.to]))

  return portPositions.filter(
    (port) =>
      port.schematicSheetId === label.schematic_sheet_id &&
      connectedTraceEndpoints.some((endpoint) =>
        positionsMatch(port.center, endpoint),
      ),
  )
}

export const getNetLabelsByComponentId = (
  circuitJson: CircuitJson,
): Map<SchematicComponentId, SchematicNetLabel[]> => {
  const portPositions = circuitJson
    .filter(
      (element): element is SchematicPort => element.type === "schematic_port",
    )
    .flatMap((port) => {
      if (!port.schematic_component_id) return []
      return [
        {
          schematicComponentId: port.schematic_component_id,
          center: port.center,
          schematicSheetId: port.schematic_sheet_id,
        },
      ]
    })
  const schematicTraces = circuitJson.filter(
    (element): element is SchematicTrace => element.type === "schematic_trace",
  )
  const netLabelsByComponentId = new Map<
    SchematicComponentId,
    SchematicNetLabel[]
  >()

  for (const label of circuitJson) {
    if (label.type !== "schematic_net_label") continue
    const connectedPorts = getPortsConnectedToLabel({
      label,
      portPositions,
      schematicTraces,
    })
    const schematicComponentIds = new Set(
      connectedPorts.map((port) => port.schematicComponentId),
    )
    if (schematicComponentIds.size !== 1) continue

    const schematicComponentId = connectedPorts[0]!.schematicComponentId
    const componentNetLabels =
      netLabelsByComponentId.get(schematicComponentId) ?? []
    componentNetLabels.push(label)
    netLabelsByComponentId.set(schematicComponentId, componentNetLabels)
  }

  return netLabelsByComponentId
}
