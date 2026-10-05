import type { SchematicPort } from "circuit-json"
import type { SchematicBoxPlacement } from "../types"
import {
  getSchematicBoxLabelRects,
  INNER_LABEL_COLLISION_PADDING,
  schematicLabelIntervalsOverlap,
  schematicLabelRectsOverlap,
  type LabelRect,
} from "./schematic-box-labels"

// Schematic units: leave readable space between label banks on different sides.
// Same-side labels retain their pin spacing; resizing does not separate them.
const MINIMUM_RESIZE_LABEL_BANK_GAP = 0.2

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
  if (!labelsFit(box, ports)) return

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
      : Math.max(
          proposed.width,
          minWidth,
          getLabelLimitedDimension(box, ports, "width"),
        )
  const height =
    proposed.height === undefined
      ? box.height
      : Math.max(
          proposed.height,
          minHeight,
          getLabelLimitedDimension(box, ports, "height"),
        )
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
      MINIMUM_RESIZE_LABEL_BANK_GAP,
    ),
  )
}

/** With the other dimension fixed, each label moves with its edge: -1/2,
 * 0 or +1/2 units per unit of resizing. Solve the resulting linear clearance
 * constraints directly, preserving the order of initially separated labels. */
function getLabelLimitedDimension(
  box: SchematicBoxPlacement,
  ports: SchematicPort[],
  dimension: "width" | "height",
): number {
  const current = box[dimension]
  const center = dimension === "width" ? box.schX : box.schY
  const minKey = dimension === "width" ? "xMin" : "yMin"
  const maxKey = dimension === "width" ? "xMax" : "yMax"
  const otherMinKey = dimension === "width" ? "yMin" : "xMin"
  const otherMaxKey = dimension === "width" ? "yMax" : "xMax"
  const speed = (label: LabelRect): number => {
    if (dimension === "width") {
      return label.side === "left" ? -0.5 : label.side === "right" ? 0.5 : 0
    }
    return label.side === "bottom" ? -0.5 : label.side === "top" ? 0.5 : 0
  }
  let minimum = 0
  const constrainGap = (gap: number, rate: number, requiredGap = 0) => {
    // A gap with zero/negative rate cannot get smaller during a shrink.
    if (rate > 0)
      minimum = Math.max(minimum, current + (requiredGap - gap) / rate)
  }
  const labels = getSchematicBoxLabelRects(box, ports, getPinLabelLength)
  for (let i = 0; i < labels.length; i++) {
    const a = labels[i]!
    constrainGap(a[minKey] - (center - current / 2), speed(a) + 0.5)
    constrainGap(center + current / 2 - a[maxKey], 0.5 - speed(a))
    for (let j = i + 1; j < labels.length; j++) {
      const b = labels[j]!
      const requiredGap =
        a.side === b.side
          ? INNER_LABEL_COLLISION_PADDING
          : MINIMUM_RESIZE_LABEL_BANK_GAP
      if (
        !schematicLabelIntervalsOverlap(
          a[otherMinKey],
          a[otherMaxKey],
          b[otherMinKey],
          b[otherMaxKey],
          requiredGap,
        )
      )
        continue
      // The original box was validated before reaching here. If the labels
      // overlap on the fixed axis, they must be separated along this axis.
      const [first, second] = a[maxKey] <= b[minKey] ? [a, b] : [b, a]
      constrainGap(
        second[minKey] - first[maxKey],
        speed(second) - speed(first),
        requiredGap,
      )
    }
  }
  return minimum
}

function labelsFit(
  resized: SchematicBoxPlacement,
  ports: SchematicPort[],
  labelBankGap = INNER_LABEL_COLLISION_PADDING,
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
      const b = labels[j]!
      const gap =
        a.side === b.side ? INNER_LABEL_COLLISION_PADDING : labelBankGap
      if (schematicLabelRectsOverlap(a, b, gap)) return false
    }
  }
  return true
}
