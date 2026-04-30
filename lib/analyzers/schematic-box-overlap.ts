import type {
  ComponentOverlap,
  OverlapCorrectionSuggestion,
  SchematicBoxPlacement,
  SchematicPlacementIssue,
} from "../types"

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
    overlapWidth,
    overlapHeight,
    correctionSuggestions: getOverlapCorrectionSuggestions({
      firstComponent,
      secondComponent,
      overlapWidth,
      overlapHeight,
    }),
  }
}

const getOverlapCorrectionSuggestions = ({
  firstComponent,
  secondComponent,
  overlapWidth,
  overlapHeight,
}: {
  firstComponent: SchematicBoxPlacement
  secondComponent: SchematicBoxPlacement
  overlapWidth: number
  overlapHeight: number
}): OverlapCorrectionSuggestion[] => {
  const firstArea = firstComponent.width * firstComponent.height
  const secondArea = secondComponent.width * secondComponent.height
  const targetComponent =
    firstArea <= secondArea ? firstComponent : secondComponent
  const otherComponent =
    targetComponent === firstComponent ? secondComponent : firstComponent
  const deltaSchX =
    targetComponent.schX <= otherComponent.schX ? -overlapWidth : overlapWidth
  const deltaSchY =
    targetComponent.schY <= otherComponent.schY ? -overlapHeight : overlapHeight

  return [
    {
      targetComponentName: targetComponent.sourceComponentName,
      deltaSchX,
      deltaSchY: 0,
      newSchX: targetComponent.schX + deltaSchX,
      newSchY: targetComponent.schY,
    },
    {
      targetComponentName: targetComponent.sourceComponentName,
      deltaSchX: 0,
      deltaSchY,
      newSchX: targetComponent.schX,
      newSchY: targetComponent.schY + deltaSchY,
    },
  ]
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
