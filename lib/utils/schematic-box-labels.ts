import type { SchematicPort } from "circuit-json"
import type { SchematicBoxPlacement, SchematicSide } from "../types"

export interface LabelRect {
  side: SchematicSide
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

// Existing inner-label collision geometry, shared by detection and resize validation.
const PIN_LABEL_EDGE_PADDING = 0.1
const PIN_LABEL_TEXT_HEIGHT = 0.15
export const INNER_LABEL_COLLISION_PADDING = 0.02
const COLLISION_COMPARISON_EPSILON = 1e-9

export function getSchematicBoxLabelRects(
  box: SchematicBoxPlacement,
  ports: SchematicPort[],
  getLabelLength: (port: SchematicPort) => number,
): LabelRect[] {
  const bounds = {
    left: box.schX - box.width / 2,
    right: box.schX + box.width / 2,
    top: box.schY + box.height / 2,
    bottom: box.schY - box.height / 2,
  }
  const rects: LabelRect[] = []

  for (const port of ports) {
    if (!port.side_of_component) continue
    if (!port.display_pin_label) continue

    const labelLength = getLabelLength(port)
    const halfTextHeight = PIN_LABEL_TEXT_HEIGHT / 2

    switch (port.side_of_component) {
      case "left": {
        const xMin = bounds.left + PIN_LABEL_EDGE_PADDING
        rects.push({
          side: port.side_of_component,
          xMin,
          xMax: xMin + labelLength,
          yMin: port.center.y - halfTextHeight,
          yMax: port.center.y + halfTextHeight,
        })
        break
      }
      case "right": {
        const xMax = bounds.right - PIN_LABEL_EDGE_PADDING
        rects.push({
          side: port.side_of_component,
          xMin: xMax - labelLength,
          xMax,
          yMin: port.center.y - halfTextHeight,
          yMax: port.center.y + halfTextHeight,
        })
        break
      }
      case "top": {
        const yMax = bounds.top - PIN_LABEL_EDGE_PADDING
        rects.push({
          side: port.side_of_component,
          xMin: port.center.x - halfTextHeight,
          xMax: port.center.x + halfTextHeight,
          yMin: yMax - labelLength,
          yMax,
        })
        break
      }
      case "bottom": {
        const yMin = bounds.bottom + PIN_LABEL_EDGE_PADDING
        rects.push({
          side: port.side_of_component,
          xMin: port.center.x - halfTextHeight,
          xMax: port.center.x + halfTextHeight,
          yMin,
          yMax: yMin + labelLength,
        })
        break
      }
    }
  }

  return rects
}

export function schematicLabelRectsOverlap(
  a: Omit<LabelRect, "side">,
  b: Omit<LabelRect, "side">,
  padding = INNER_LABEL_COLLISION_PADDING,
): boolean {
  return (
    schematicLabelIntervalsOverlap(a.xMin, a.xMax, b.xMin, b.xMax, padding) &&
    schematicLabelIntervalsOverlap(a.yMin, a.yMax, b.yMin, b.yMax, padding)
  )
}

export function schematicLabelIntervalsOverlap(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
  padding = INNER_LABEL_COLLISION_PADDING,
): boolean {
  return (
    Math.min(aMax, bMax) - Math.max(aMin, bMin) + padding >
    COLLISION_COMPARISON_EPSILON
  )
}
