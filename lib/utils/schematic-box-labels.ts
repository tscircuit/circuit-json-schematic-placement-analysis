import type { CircuitJson, SchematicPort } from "circuit-json"
import { getUnitVectorFromDirection } from "@tscircuit/math-utils"
import type {
  SchematicBoxPlacement,
  SchematicSide,
  SchematicPinLabelBounds,
} from "../types"
import { getSchematicTextWidth } from "./schematic-text-geometry"

export interface LabelRect {
  side: SchematicSide
  schematicPortId: string
  text: string
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

// Existing inner-label collision geometry, shared by detection and resize validation.
const PIN_LABEL_EDGE_PADDING = 0.1
const PIN_LABEL_TEXT_HEIGHT = 0.15
export const INNER_LABEL_COLLISION_PADDING = 0.02
// Readable clearance between labels on different sides, in schematic units.
export const MINIMUM_LABEL_BANK_GAP = 0.1
const COLLISION_COMPARISON_EPSILON = 1e-9

/** Match circuit-to-svg's createSvgObjectsForSchPortPinLabel label precedence.
 * Resolve before measuring so text parts, overlines, and font sizes use the same
 * effective label throughout detection and resize validation. Do not mutate input. */
export function getSchematicPortsWithResolvedLabels(
  circuitJson: CircuitJson,
): SchematicPort[] {
  const components = new Map(
    circuitJson
      .filter((element) => element.type === "schematic_component")
      .map((component) => [component.schematic_component_id, component]),
  )
  return circuitJson
    .filter((element) => element.type === "schematic_port")
    .map((port) => {
      if (!port.schematic_component_id) return port
      const label =
        port.display_pin_label ??
        components.get(port.schematic_component_id)?.port_labels?.[
          `${port.pin_number}`
        ]
      return label === undefined || label === port.display_pin_label
        ? port
        : { ...port, display_pin_label: label }
    })
}

/** With a fixed box center, an edge moves half the dimension change.
 * An undefined side represents stationary internal graphics. */
export function getLabelMovementFactor(
  side: SchematicSide | undefined,
  dimension: "width" | "height",
): number {
  if (!side) return 0
  const direction = side === "top" ? "up" : side === "bottom" ? "down" : side
  const vector = getUnitVectorFromDirection(direction)
  return (dimension === "width" ? vector.x : vector.y) / 2
}

/** Mirror the renderer's display syntax, without inferring any electrical role.
 * Text parts replace the label; N_ is hidden and rendered as an overline. */
export function getSchematicPinLabelText(port: SchematicPort): string {
  if (port.display_pin_label_text_parts?.length)
    return port.display_pin_label_text_parts.map((part) => part.text).join("")
  const label = port.display_pin_label ?? ""
  return label.startsWith("N_") ? label.slice(2) : label
}

export function getSchematicPinLabelFontSize(port: SchematicPort): number {
  return (
    port.display_pin_label_font_size ??
    ((port.display_pin_label ?? "").startsWith("N_") ||
    port.is_drawn_with_inversion_circle
      ? PIN_LABEL_TEXT_HEIGHT * 0.8
      : PIN_LABEL_TEXT_HEIGHT)
  )
}

export const getSchematicPinLabelWidth = (port: SchematicPort): number =>
  getSchematicTextWidth(
    getSchematicPinLabelText(port),
    getSchematicPinLabelFontSize(port),
  )

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

    const text = getSchematicPinLabelText(port)
    const fontSize = getSchematicPinLabelFontSize(port)
    if (!text || !Number.isFinite(fontSize) || fontSize <= 0) continue
    const labelLength = getLabelLength(port)
    const halfTextHeight = fontSize / 2
    const metadata = { text, schematicPortId: port.schematic_port_id }

    switch (port.side_of_component) {
      case "left": {
        const xMin = bounds.left + PIN_LABEL_EDGE_PADDING
        rects.push({
          ...metadata,
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
          ...metadata,
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
          ...metadata,
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
          ...metadata,
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

/** Give the overlay a small visual margin around the nominal text bounds.
 * SVG's middle baseline and actual glyph advances vary by sans-serif font.
 * This margin only frames the highlight; it does not affect detection. */
export function getPinLabelHighlightBounds(label: SchematicPinLabelBounds) {
  const { bounds, side } = label
  const fontSize =
    side === "left" || side === "right"
      ? bounds.top - bounds.bottom
      : bounds.right - bounds.left
  const margin = fontSize * 0.2
  return {
    left: bounds.left - margin,
    right: bounds.right + margin,
    top: bounds.top + margin,
    bottom: bounds.bottom - margin,
  }
}

export function schematicLabelRectsOverlap(
  a: Pick<LabelRect, "xMin" | "xMax" | "yMin" | "yMax">,
  b: Pick<LabelRect, "xMin" | "xMax" | "yMin" | "yMax">,
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
