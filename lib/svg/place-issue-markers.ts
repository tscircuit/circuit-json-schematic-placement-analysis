export type Point = { x: number; y: number }
export type SvgViewport = {
  left: number
  top: number
  right: number
  bottom: number
}

export const ISSUE_MARKER_RADIUS = 11

/** Reserve marker centers inside the visible SVG coordinates, including a cropped viewBox. */
export function createIssueMarkerPlacer(viewport: SvgViewport, scale = 1) {
  const inset = (ISSUE_MARKER_RADIUS + 1) * scale
  const spacing = (2 * ISSUE_MARKER_RADIUS + 4) * scale
  const left = viewport.left + inset
  const right = viewport.right - inset
  const top = viewport.top + inset
  const bottom = viewport.bottom - inset
  const placed: Point[] = []
  const maxRing = Math.ceil(
    Math.max(viewport.right - viewport.left, viewport.bottom - viewport.top) /
      spacing,
  )

  return (anchor: Point): Point => {
    const origin = {
      x: Math.max(left, Math.min(right, anchor.x)),
      y: Math.max(top, Math.min(bottom, anchor.y)),
    }
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
          const candidate = {
            x: origin.x + dx * spacing,
            y: origin.y + dy * spacing,
          }
          if (
            candidate.x < left ||
            candidate.x > right ||
            candidate.y < top ||
            candidate.y > bottom
          )
            continue
          if (
            placed.some(
              (point) =>
                Math.hypot(point.x - candidate.x, point.y - candidate.y) <
                spacing - 1e-6 * scale,
            )
          )
            continue
          placed.push(candidate)
          return candidate
        }
      }
    }
    throw new Error(
      "Not enough room for issue markers; increase the schematic width or height",
    )
  }
}
