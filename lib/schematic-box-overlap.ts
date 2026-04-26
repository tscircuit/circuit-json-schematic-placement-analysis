import type {
  ComponentOverlap,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "./types"

interface RectBounds {
  left: number
  right: number
  top: number
  bottom: number
}

const getCenteredRectBounds = (box: SchematicBoxPlacement): RectBounds => {
  const halfWidth = box.width / 2
  const halfHeight = box.height / 2

  return {
    left: box.schX - halfWidth,
    right: box.schX + halfWidth,
    top: box.schY - halfHeight,
    bottom: box.schY + halfHeight,
  }
}

const getComponentOverlap = (
  firstComponent: SchematicBoxPlacement,
  secondComponent: SchematicBoxPlacement,
): ComponentOverlap | null => {
  const firstBounds = getCenteredRectBounds(firstComponent)
  const secondBounds = getCenteredRectBounds(secondComponent)
  const left = Math.max(firstBounds.left, secondBounds.left)
  const right = Math.min(firstBounds.right, secondBounds.right)
  const top = Math.max(firstBounds.top, secondBounds.top)
  const bottom = Math.min(firstBounds.bottom, secondBounds.bottom)
  const overlapWidth = right - left
  const overlapHeight = bottom - top

  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return null
  }

  return {
    lineItemType: "ComponentOverlap",
    firstComponent,
    secondComponent,
    overlapCenter: {
      schX: left + overlapWidth / 2,
      schY: top + overlapHeight / 2,
    },
    overlapWidth,
    overlapHeight,
  }
}

export const generateSchematicPlacementIssues = (
  componentPlacements: SchematicBoxPlacement[],
): SchematicPlacementIssue[] => {
  const issues: SchematicPlacementIssue[] = []

  for (
    let firstIndex = 0;
    firstIndex < componentPlacements.length;
    firstIndex++
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < componentPlacements.length;
      secondIndex++
    ) {
      const overlap = getComponentOverlap(
        componentPlacements[firstIndex]!,
        componentPlacements[secondIndex]!,
      )

      if (overlap) {
        issues.push(overlap)
      }
    }
  }

  return issues
}
