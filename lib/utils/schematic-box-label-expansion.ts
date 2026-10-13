import type { SchematicBoxPlacement } from "../types"
import {
  getLabelMovementFactor,
  MINIMUM_LABEL_BANK_GAP,
  schematicLabelRectsOverlap,
  type LabelRect,
} from "./schematic-box-labels"

type Dimension = "width" | "height"
type Expansion = { width?: number; height?: number }

function getRequiredGrowth(
  a: LabelRect,
  b: LabelRect,
  dimension: Dimension,
): number {
  const rate =
    getLabelMovementFactor(b.side, dimension) -
    getLabelMovementFactor(a.side, dimension)
  if (rate === 0) return Infinity
  const [first, second] = rate > 0 ? [a, b] : [b, a]
  const gap =
    dimension === "width" ? second.xMin - first.xMax : second.yMin - first.yMax
  return (MINIMUM_LABEL_BANK_GAP - gap) / Math.abs(rate)
}

/** Move labels with their box edges, preserving pin coordinates along each edge.
 * Recheck every pair after each growth to catch newly introduced corner conflicts.
 * Each resolved pair separates in the direction of growth and stays separated. */
export function getSchematicBoxLabelExpansion(
  box: SchematicBoxPlacement,
  labels: LabelRect[],
): Expansion | undefined {
  const expand = (onlyDimension?: Dimension): Expansion | undefined => {
    let width = box.width
    let height = box.height
    const rects = labels.map((rect) => ({ ...rect }))
    const pairCount = (rects.length * (rects.length - 1)) / 2
    for (let iteration = 0; iteration <= pairCount; iteration++) {
      let collision: [LabelRect, LabelRect] | undefined
      for (let i = 0; i < rects.length && !collision; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]!
          const b = rects[j]!
          if (
            a.side !== b.side &&
            schematicLabelRectsOverlap(a, b, MINIMUM_LABEL_BANK_GAP)
          ) {
            collision = [a, b]
            break
          }
        }
      }
      if (!collision) {
        return {
          width: width > box.width ? width : undefined,
          height: height > box.height ? height : undefined,
        }
      }
      const [a, b] = collision
      const growWidth =
        onlyDimension === "height" ? Infinity : getRequiredGrowth(a, b, "width")
      const growHeight =
        onlyDimension === "width" ? Infinity : getRequiredGrowth(a, b, "height")
      const dimension =
        growWidth * height <= growHeight * width ? "width" : "height"
      const growth = dimension === "width" ? growWidth : growHeight
      if (!Number.isFinite(growth) || growth <= 0) return
      const current = dimension === "width" ? width : height
      // Round upward so the three-decimal XML suggestion retains the clearance.
      const next = Math.ceil((current + growth) * 1000 - 1e-9) / 1000
      const delta = next - current
      if (dimension === "width") width = next
      else height = next
      const minKey = dimension === "width" ? "xMin" : "yMin"
      const maxKey = dimension === "width" ? "xMax" : "yMax"
      for (const rect of rects) {
        const movement = getLabelMovementFactor(rect.side, dimension) * delta
        rect[minKey] += movement
        rect[maxKey] += movement
      }
    }
  }
  const candidates = [expand("width"), expand("height"), expand()].filter(
    (candidate): candidate is Expansion => candidate !== undefined,
  )
  const area = (candidate: Expansion) =>
    (candidate.width ?? box.width) * (candidate.height ?? box.height)
  return candidates.sort((a, b) => area(a) - area(b))[0]
}
