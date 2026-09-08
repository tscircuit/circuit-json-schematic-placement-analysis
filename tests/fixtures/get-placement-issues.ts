import type { SchematicPlacementAnalysis } from "lib/index"

export const getPlacementIssues = (analysis: SchematicPlacementAnalysis) =>
  analysis
    .getLineItems()
    .flatMap((item) =>
      item.lineItemType === "SchematicPlacementIssues" ? item.issues : [],
    )
