import type { CircuitJson } from "circuit-json"
import type { LabelRect } from "./schematic-box-labels"

export type GraphicBounds = Omit<LabelRect, "side">

/** Measure the internal symbol primitives emitted by core, including strokes.
 * Ownership comes from Circuit JSON; connector standards and names are irrelevant. */
export function getSchematicBoxGraphicBounds(
  circuitJson: CircuitJson,
  componentId: string,
): GraphicBounds | undefined {
  let bounds: GraphicBounds | undefined
  for (const element of circuitJson) {
    if (
      (element.type !== "schematic_path" &&
        element.type !== "schematic_circle" &&
        element.type !== "schematic_rect") ||
      element.schematic_component_id !== componentId
    )
      continue
    const stroke = (element.stroke_width ?? 0.02) / 2
    let current: GraphicBounds
    if (element.type === "schematic_path") {
      if (!element.points.length) continue
      current = {
        xMin: Math.min(...element.points.map((p) => p.x)),
        xMax: Math.max(...element.points.map((p) => p.x)),
        yMin: Math.min(...element.points.map((p) => p.y)),
        yMax: Math.max(...element.points.map((p) => p.y)),
      }
    } else {
      const angle =
        element.type === "schematic_rect"
          ? ((element.rotation ?? 0) * Math.PI) / 180
          : 0
      const width =
        element.type === "schematic_circle" ? 2 * element.radius : element.width
      const height =
        element.type === "schematic_circle"
          ? 2 * element.radius
          : element.height
      const halfWidth =
        (Math.abs(width * Math.cos(angle)) +
          Math.abs(height * Math.sin(angle))) /
        2
      const halfHeight =
        (Math.abs(width * Math.sin(angle)) +
          Math.abs(height * Math.cos(angle))) /
        2
      current = {
        xMin: element.center.x - halfWidth,
        xMax: element.center.x + halfWidth,
        yMin: element.center.y - halfHeight,
        yMax: element.center.y + halfHeight,
      }
    }
    current.xMin -= stroke
    current.xMax += stroke
    current.yMin -= stroke
    current.yMax += stroke
    bounds = bounds
      ? {
          xMin: Math.min(bounds.xMin, current.xMin),
          xMax: Math.max(bounds.xMax, current.xMax),
          yMin: Math.min(bounds.yMin, current.yMin),
          yMax: Math.max(bounds.yMax, current.yMax),
        }
      : current
  }
  return bounds
}
