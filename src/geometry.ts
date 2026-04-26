export interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export interface RectOverlap {
  width: number
  height: number
  area: number
  center: {
    x: number
    y: number
  }
}

export function getCenteredRectBounds(input: {
  x: number
  y: number
  width: number
  height: number
}): RectBounds {
  const halfWidth = input.width / 2
  const halfHeight = input.height / 2

  return {
    left: input.x - halfWidth,
    right: input.x + halfWidth,
    top: input.y - halfHeight,
    bottom: input.y + halfHeight,
  }
}

export function getRectOverlap(
  first: RectBounds,
  second: RectBounds,
): RectOverlap | null {
  const left = Math.max(first.left, second.left)
  const right = Math.min(first.right, second.right)
  const top = Math.max(first.top, second.top)
  const bottom = Math.min(first.bottom, second.bottom)

  const width = right - left
  const height = bottom - top

  if (width <= 0 || height <= 0) {
    return null
  }

  return {
    width,
    height,
    area: width * height,
    center: {
      x: left + width / 2,
      y: top + height / 2,
    },
  }
}
