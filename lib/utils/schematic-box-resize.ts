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

/** Validate joint and single-axis proposals while preserving every pin's position
 * along its edge. Missing side metadata cannot establish a safe resize. */
export function getSafeSchematicBoxResize(
  box: SchematicBoxPlacement,
  ports: SchematicPort[],
  pinSpacing: number,
  proposed: { width?: number; height?: number },
  minimumReduction = 0,
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
  // Each caller owns its reporting threshold. The padding rule requires a
  // spacing per edge; the width rule has already checked its label-gap limit.
  const isUsefulReduction = (reduction: number) =>
    reduction > 1e-9 && reduction >= minimumReduction - 1e-9
  const suggestedWidth = isUsefulReduction(box.width - width)
    ? width
    : undefined
  const suggestedHeight = isUsefulReduction(box.height - height)
    ? height
    : undefined
  if (suggestedWidth === undefined && suggestedHeight === undefined) return

  const candidates: Array<{ width?: number; height?: number }> = [
    { width: suggestedWidth, height: suggestedHeight },
  ]
  if (suggestedWidth !== undefined && suggestedHeight !== undefined) {
    candidates.push({ width: suggestedWidth }, { height: suggestedHeight })
  }
  const area = (candidate: { width?: number; height?: number }) =>
    (candidate.width ?? box.width) * (candidate.height ?? box.height)
  // A corner collision may invalidate the joint proposal while either axis
  // remains useful. Apply identical geometry checks and prefer the smallest
  // valid body; never combine separately validated dimensions afterward.
  candidates.sort((a, b) => area(a) - area(b))
  return candidates.find((candidate) =>
    labelsFit(
      {
        ...box,
        width: candidate.width ?? box.width,
        height: candidate.height ?? box.height,
      },
      ports,
    ),
  )
}

function labelsFit(
  resized: SchematicBoxPlacement,
  ports: SchematicPort[],
): boolean {
  if (!Number.isFinite(resized.width) || !Number.isFinite(resized.height))
    return false
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
      return false
    for (let j = i + 1; j < labels.length; j++) {
      if (schematicLabelRectsOverlap(a, labels[j]!)) return false
    }
  }
  return true
}
