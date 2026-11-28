import type { SchematicIssueBounds } from "../index"

export function shouldCropIssueOverlay(input: {
  issueTypes?: readonly string[]
  issueIndex?: number
  viewportBounds?: SchematicIssueBounds
  showFullSchematic?: boolean
}): boolean {
  return (
    input.showFullSchematic === false ||
    (input.showFullSchematic === undefined &&
      (input.issueTypes !== undefined ||
        input.issueIndex !== undefined ||
        input.viewportBounds !== undefined))
  )
}
