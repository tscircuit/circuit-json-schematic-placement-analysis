import type { SchematicText } from "circuit-json"
import type { RectBounds } from "./geometry"

export interface Point {
  x: number
  y: number
}

export type Polygon = Point[]

export const rectPolygon = (bounds: RectBounds): Polygon => [
  { x: bounds.left, y: bounds.bottom },
  { x: bounds.right, y: bounds.bottom },
  { x: bounds.right, y: bounds.top },
  { x: bounds.left, y: bounds.top },
]

// Circuit JSON does not contain glyph metrics. Approximate the renderer's
// sans-serif advances in ems, with narrower punctuation and wider M/W glyphs.
// These are text-line bounds, not a claim of pixel-exact glyph intersections.
const advance = (character: string): number => {
  if (/\s/.test(character)) return 0.28
  if (/[ilI.,:;!'|]/.test(character)) return 0.25
  if (/[MW@%]/.test(character)) return 0.9
  if (/[mw]/.test(character)) return 0.8
  if (/[A-Z]/.test(character)) return 0.67
  return 0.56
}

const widthInEm = (text: string): number =>
  Array.from(text).reduce((width, character) => width + advance(character), 0)

export function getSchematicTextPolygons(text: SchematicText): Polygon[] {
  const size = text.font_size
  if (
    !Number.isFinite(size) ||
    size <= 0 ||
    !Number.isFinite(text.rotation) ||
    !Number.isFinite(text.position.x) ||
    !Number.isFinite(text.position.y)
  )
    return []

  const anchor = text.anchor
  const horizontal = anchor.includes("left")
    ? 0
    : anchor.includes("right")
      ? 1
      : 0.5
  const top = anchor.includes("top")
    ? 0
    : anchor.includes("bottom")
      ? size
      : size / 2
  // SVG rotates clockwise on a Y-down canvas; our geometry uses Y-up.
  const radians = (-text.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return text.text.split("\n").flatMap((line, index) => {
    const visible = line.trim()
    if (!visible) return []
    const leading = line.length - line.trimStart().length
    const left =
      (widthInEm(line.slice(0, leading)) - widthInEm(line) * horizontal) * size
    const polygon = rectPolygon({
      left,
      right: left + widthInEm(visible) * size,
      // Leave the small whitespace at the top/bottom of an em outside the
      // collision region. Otherwise a readable caption just above a wire
      // (e.g. 100V at y=4.8, size=0.22 above a wire at y=4.7) is a false hit.
      top: top - index * size - size * 0.05,
      bottom: top - (index + 1) * size + size * 0.05,
    })
    return [
      polygon.map(({ x, y }) => ({
        x: text.position.x + x * cos - y * sin,
        y: text.position.y + x * sin + y * cos,
      })),
    ]
  })
}

/** Separating-axis test; boundary contact alone is not an overlap. */
export function polygonsOverlap(a: Polygon, b: Polygon): boolean {
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i]!
      const q = polygon[(i + 1) % polygon.length]!
      const length = Math.hypot(q.x - p.x, q.y - p.y)
      if (length < 1e-9) continue
      const nx = -(q.y - p.y) / length
      const ny = (q.x - p.x) / length
      const project = (points: Polygon) =>
        points.map(({ x, y }) => x * nx + y * ny)
      const pa = project(a)
      const pb = project(b)
      if (
        Math.min(Math.max(...pa), Math.max(...pb)) -
          Math.max(Math.min(...pa), Math.min(...pb)) <=
        1e-6
      )
        return false
    }
  }
  return true
}

export function traceSegmentPolygon(
  from: Point,
  to: Point,
): Polygon | undefined {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (length < 1e-9) return undefined
  // Schematic wires have a nominal 0.02-unit stroke.
  const dx = (-(to.y - from.y) / length) * 0.01
  const dy = ((to.x - from.x) / length) * 0.01
  return [
    { x: from.x + dx, y: from.y + dy },
    { x: to.x + dx, y: to.y + dy },
    { x: to.x - dx, y: to.y - dy },
    { x: from.x - dx, y: from.y - dy },
  ]
}

/** Clip a segment to the strict interior of a counterclockwise polygon.
 * A label sitting beside its wire is valid even if the nominal line bounds
 * touch the wire stroke. Require the wire centerline to enter the text area.
 */
export function segmentCrossesPolygon(
  from: Point,
  to: Point,
  polygon: Polygon,
): boolean {
  if (Math.hypot(to.x - from.x, to.y - from.y) < 1e-9) return false
  let low = 0
  let high = 1
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!
    const q = polygon[(i + 1) % polygon.length]!
    const length = Math.hypot(q.x - p.x, q.y - p.y)
    if (length < 1e-9) continue
    const nx = -(q.y - p.y) / length
    const ny = (q.x - p.x) / length
    const start = (from.x - p.x) * nx + (from.y - p.y) * ny - 1e-6
    const end = (to.x - p.x) * nx + (to.y - p.y) * ny - 1e-6
    if (start <= 0 && end <= 0) return false
    if (start <= 0) low = Math.max(low, -start / (end - start))
    if (end <= 0) high = Math.min(high, -start / (end - start))
    if (high <= low) return false
  }
  return high > low
}

export const polygonBounds = (polygons: Polygon[]): RectBounds => {
  const points = polygons.flat()
  return {
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
    top: Math.max(...points.map((p) => p.y)),
    bottom: Math.min(...points.map((p) => p.y)),
  }
}
