export function pointOnSegment(params: {
  point: { x: number; y: number }
  start: { x: number; y: number }
  end: { x: number; y: number }
  eps: number
}): boolean {
  const { point, start, end, eps } = params
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y) < eps
  }
  if (length < eps) {
    return Math.hypot(point.x - start.x, point.y - start.y) < eps
  }
  const projection =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / length
  const perpendicular =
    Math.abs((point.x - start.x) * dy - (point.y - start.y) * dx) / length
  return perpendicular < eps && projection >= -eps && projection <= length + eps
}
