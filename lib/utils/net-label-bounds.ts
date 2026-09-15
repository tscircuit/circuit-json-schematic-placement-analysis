import type { SchematicNetLabel } from "circuit-json"
import type { RectBounds } from "./geometry"

/** Approximate label bounds shared by collision and movement validation. */
export function getNetLabelBounds(label: SchematicNetLabel): RectBounds {
  const anchorSide = label.anchor_side
  const isVertical = anchorSide === "top" || anchorSide === "bottom"

  if (isVertical) {
    const anchorY = label.anchor_position?.y ?? label.center.y
    const textHalfExtent = ((label.text?.length ?? 8) * 0.13) / 2 + 0.1
    const left = label.center.x - 0.1
    const right = label.center.x + 0.1
    if (anchorSide === "top") {
      return {
        left,
        right,
        top: anchorY,
        bottom: anchorY - textHalfExtent * 2,
      }
    }
    return { left, right, top: anchorY + textHalfExtent * 2, bottom: anchorY }
  }

  const anchorX = label.anchor_position?.x ?? label.center.x
  const halfWidth = Math.abs(label.center.x - anchorX)
  const farHalfWidth = halfWidth + 0.1
  const top = label.center.y + 0.1
  const bottom = label.center.y - 0.1
  if (label.center.x >= anchorX) {
    return {
      left: anchorX,
      right: label.center.x + farHalfWidth,
      top,
      bottom,
    }
  }
  return { left: label.center.x - farHalfWidth, right: anchorX, top, bottom }
}
