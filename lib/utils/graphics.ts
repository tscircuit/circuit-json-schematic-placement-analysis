import type {
  CircuitJson,
  SchematicNetLabel,
  SchematicPort,
} from "circuit-json"
import type { GraphicsObject } from "graphics-debug"
import { getColorFromString } from "./getColorFromString"
import { SchematicPlacement } from "../analyzers/SchematicPlacement"

export interface HighlightPlacement {
  schX: number
  schY: number
  width: number
  height: number
}

export const mergeGraphicsObjects = (
  objects: Array<GraphicsObject | undefined>,
): GraphicsObject => ({
  lines: objects.flatMap((object) => object?.lines ?? []),
  points: objects.flatMap((object) => object?.points ?? []),
  rects: objects.flatMap((object) => object?.rects ?? []),
  circles: objects.flatMap((object) => object?.circles ?? []),
  texts: objects.flatMap((object) => object?.texts ?? []),
  polygons: objects.flatMap((object) => object?.polygons ?? []),
  arrows: objects.flatMap((object) => object?.arrows ?? []),
  infiniteLines: objects.flatMap((object) => object?.infiniteLines ?? []),
})

export const visualizeCircuitJson = (
  circuitJson: CircuitJson,
): GraphicsObject => {
  const placements = new SchematicPlacement({ circuitJson }).createPlacements()
  const portsBySchematicComponentId =
    buildPortsBySchematicComponentId(circuitJson)

  return {
    rects: placements.map((placement) => {
      const label =
        placement.sourceComponentName ??
        placement.schematicComponentId ??
        placement.subcircuitId ??
        placement.schematicSymbolId ??
        "schematic-box"
      const adjustedPlacement = expandPlacementToFitPorts(
        placement,
        placement.schematicComponentId
          ? (portsBySchematicComponentId.get(placement.schematicComponentId) ??
              [])
          : [],
      )

      return {
        label,
        center: {
          x: adjustedPlacement.schX,
          y: adjustedPlacement.schY,
        },
        width: adjustedPlacement.width,
        height: adjustedPlacement.height,
        fill: getColorFromString(label, 0.2),
        stroke: getColorFromString(label, 0.9),
      }
    }),
    points: circuitJson.flatMap((element) => {
      if (element.type === "schematic_port") {
        return [visualizeSchematicPort(element)]
      }

      if (element.type === "schematic_net_label") {
        return [visualizeSchematicNetLabel(element)]
      }

      return []
    }),
  }
}

const visualizeSchematicPort = (port: SchematicPort) => ({
  x: port.center.x,
  y: port.center.y,
  color: getColorFromString(port.source_port_id, 0.9),
  label: port.display_pin_label ?? port.source_port_id,
})

const visualizeSchematicNetLabel = (netLabel: SchematicNetLabel) => ({
  x: netLabel.center.x,
  y: netLabel.center.y,
  color: getColorFromString(
    netLabel.source_net_id ?? netLabel.schematic_net_label_id ?? netLabel.text,
    0.9,
  ),
  label: netLabel.text,
})

export const highlightPlacement = (
  placement: HighlightPlacement,
  color: string,
  label?: string,
): GraphicsObject => ({
  rects: [
    {
      center: {
        x: placement.schX,
        y: placement.schY,
      },
      width: placement.width,
      height: placement.height,
      fill: color.replace(/[\d.]+\)$/, "0.18)"),
      stroke: color,
      label,
    },
  ],
})

export const highlightPoint = (input: {
  x: number
  y: number
  color: string
  label?: string
  radius?: number
}): GraphicsObject => ({
  circles: [
    {
      center: {
        x: input.x,
        y: input.y,
      },
      radius: input.radius ?? 0.18,
      fill: input.color,
      stroke: input.color,
      label: input.label,
    },
  ],
})

const buildPortsBySchematicComponentId = (
  circuitJson: CircuitJson,
): Map<string, SchematicPort[]> => {
  const portsBySchematicComponentId = new Map<string, SchematicPort[]>()

  for (const element of circuitJson) {
    if (element.type !== "schematic_port" || !element.schematic_component_id) {
      continue
    }

    const ports =
      portsBySchematicComponentId.get(element.schematic_component_id) ?? []
    ports.push(element)
    portsBySchematicComponentId.set(element.schematic_component_id, ports)
  }

  return portsBySchematicComponentId
}

const expandPlacementToFitPorts = (
  placement: {
    schX: number
    schY: number
    width: number
    height: number
  },
  ports: SchematicPort[],
) => {
  if (ports.length === 0) return placement

  const halfWidth = placement.width / 2
  const halfHeight = placement.height / 2

  let maxDx = 0
  let maxDy = 0

  for (const port of ports) {
    maxDx = Math.max(maxDx, Math.abs(port.center.x - placement.schX))
    maxDy = Math.max(maxDy, Math.abs(port.center.y - placement.schY))
  }

  return {
    ...placement,
    width: Math.max(halfWidth, maxDx) * 2,
    height: Math.max(halfHeight, maxDy) * 2,
  }
}
