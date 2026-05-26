/** Axis-aligned rectangle bounds, Y-up convention (top > bottom). */
export interface RectBounds {
  left: number
  right: number
  top: number    // larger Y value (cartesian up)
  bottom: number  // smaller Y value
}

/** Create center-anchored rectangle bounds. */
export function centeredRect(
  cx: number,
  cy: number,
  w: number,
  h: number,
): RectBounds {
  return {
    left: cx - w / 2,
    right: cx + w / 2,
    top: cy + h / 2,
    bottom: cy - h / 2,
  }
}

/** Return overlap dimensions {ow, oh}, or null when not overlapping. */
export function rectOverlap(
  a: RectBounds,
  b: RectBounds,
): { ow: number; oh: number } | null {
  const ow = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const oh = Math.min(a.top, b.top) - Math.max(a.bottom, b.bottom)
  return ow > 0 && oh > 0 ? { ow, oh } : null
}

/**
 * Minimum translation to separate rect A from rect B.
 * Returns null when rects do not overlap.
 * dx/dy gives direction + magnitude to move A away from B.
 * Picks the axis with smaller overlap (true minimum translation vector).
 */
export function minTranslationVector(
  a: RectBounds,
  b: RectBounds,
  clearance = 0,
): { dx: number; dy: number } | null {
  const ow = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const oh = Math.min(a.top, b.top) - Math.max(a.bottom, b.bottom)
  if (ow <= 0 || oh <= 0) return null
  const aCx = (a.left + a.right) / 2
  const bCx = (b.left + b.right) / 2
  const aCy = (a.bottom + a.top) / 2
  const bCy = (b.bottom + b.top) / 2
  if (ow <= oh) {
    let signX = 1
    if (aCx <= bCx) signX = -1
    return { dx: signX * (ow + clearance), dy: 0 }
  }
  let signY = 1
  if (aCy <= bCy) signY = -1
  return { dx: 0, dy: signY * (oh + clearance) }
}
