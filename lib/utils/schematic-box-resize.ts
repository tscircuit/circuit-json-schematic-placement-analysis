import type { SchematicPort } from "circuit-json"
import type { SchematicBoxPlacement } from "../types"
import {
  getSchematicBoxLabelRects,
  schematicLabelRectsOverlap,
} from "./schematic-box-labels"

/** Native pin labels use the renderer's 0.15-unit font. Measure their displayed
 * text uniformly; names and electrical roles do not determine text geometry. */
export const getPinLabelLength = (port: SchematicPort): number =>
  Array.from(port.display_pin_label ?? "").length * 0.095

/** Validate the proposed dimensions together, preserving every pin's position
 * along its edge. Missing side metadata cannot establish a safe resize. */
export function getSafeSchematicBoxResize(
  box: SchematicBoxPlacement,
  ports: SchematicPort[],
  pinSpacing: number,
  proposed: { width?: number; height?: number },
): { width?: number; height?: number } | undefined {
  if (!Number.isFinite(pinSpacing) || pinSpacing <= 0) return
  if (ports.some((port) => !port.side_of_component)) return

  let minWidth = 0
  let minHeight = 0
  for (const port of ports) {
    if (
      port.side_of_component === "left" ||
      port.side_of_component === "right"
    ) {
      minHeight = Math.max(
        minHeight,
        2 * (Math.abs(port.center.y - box.schY) + pinSpacing),
      )
    } else {
      minWidth = Math.max(
        minWidth,
        2 * (Math.abs(port.center.x - box.schX) + pinSpacing),
      )
    }
  }
  const width =
    proposed.width === undefined
      ? box.width
      : Math.max(proposed.width, minWidth)
  const height =
    proposed.height === undefined
      ? box.height
      : Math.max(proposed.height, minHeight)
  // Preserve the rule's one-spacing-per-edge tolerance after clamping to all
  // pin banks; an insignificant remaining reduction is not excessive padding.
  const suggestedWidth =
    box.width - width >= 2 * pinSpacing - 1e-9 ? width : undefined
  const suggestedHeight =
    box.height - height >= 2 * pinSpacing - 1e-9 ? height : undefined
  if (suggestedWidth === undefined && suggestedHeight === undefined) return

  const resized = {
    ...box,
    width: suggestedWidth ?? box.width,
    height: suggestedHeight ?? box.height,
  }
  if (!Number.isFinite(resized.width) || !Number.isFinite(resized.height))
    return
  const labels = getSchematicBoxLabelRects(resized, ports, getPinLabelLength)
  for (let i = 0; i < labels.length; i++) {
    const a = labels[i]!
    // A label also needs to remain inside the body, even if it hits no other label.
    if (
      a.xMin < resized.schX - resized.width / 2 - 1e-9 ||
      a.xMax > resized.schX + resized.width / 2 + 1e-9 ||
      a.yMin < resized.schY - resized.height / 2 - 1e-9 ||
      a.yMax > resized.schY + resized.height / 2 + 1e-9
    )
      return
    for (let j = i + 1; j < labels.length; j++) {
      if (schematicLabelRectsOverlap(a, labels[j]!)) return
    }
  }
  return { width: suggestedWidth, height: suggestedHeight }
}
