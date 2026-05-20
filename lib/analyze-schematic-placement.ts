import type { CircuitJson } from "circuit-json"
import { SchematicPlacementPipeline } from "./solvers/SchematicPlacementPipeline/SchematicPlacementPipeline"
import { SchematicBoxOverlapSolver } from "./solvers/SchematicBoxOverlapSolver/SchematicBoxOverlapSolver"
import { CapacitorOrientationSolver } from "./solvers/CapacitorOrientationSolver/CapacitorOrientationSolver"
import { VerboseNetLabelSolver } from "./solvers/VerboseNetLabelSolver/VerboseNetLabelSolver"
import { SchematicBoxInnerLabelCollisionSolver } from "./solvers/SchematicBoxInnerLabelCollisionSolver/SchematicBoxInnerLabelCollisionSolver"
import { SchematicBoxTooWideSolver } from "./solvers/SchematicBoxTooWideSolver/SchematicBoxTooWideSolver"
import { SchematicPinPaddingToEdgeSolver } from "./solvers/SchematicPinPaddingToEdgeSolver/SchematicPinPaddingToEdgeSolver"
import { DiodeResistorAlignmentSolver } from "./solvers/DiodeResistorAlignmentSolver/DiodeResistorAlignmentSolver"
import { NetLabelOrientationSolver } from "./solvers/NetLabelOrientationSolver/NetLabelOrientationSolver"
import type {
  SchematicBoxPlacementLineItem,
  SchematicPlacementIssue,
  SchematicPlacementLineItem,
} from "./types"
import { addAttr } from "./utils/format"

export class SchematicPlacementAnalysis {
  constructor(private readonly lineItems: SchematicPlacementLineItem[]) {}

  getLineItems(): SchematicPlacementLineItem[] {
    return this.lineItems
  }

  getString(): string {
    return this.toString()
  }

  schematicBoxPlacementsToString(
    lineItem: SchematicBoxPlacementLineItem,
  ): string {
    const attrs: string[] = []
    addAttr(attrs, "componentName", lineItem.sourceComponentName)
    addAttr(attrs, "positionAnchor", lineItem.positionAnchor)
    addAttr(attrs, "schX", lineItem.schX)
    addAttr(attrs, "schY", lineItem.schY)
    addAttr(attrs, "width", lineItem.width)
    addAttr(attrs, "height", lineItem.height)
    return `<SchematicBoxPlacement ${attrs.join(" ")} />`
  }

  schematicIssuesToString(issue: SchematicPlacementIssue): string {
    switch (issue.lineItemType) {
      case "ComponentOverlap":
        return SchematicBoxOverlapSolver.issueToString(issue)
      case "CapacitorSymbolHorizontal":
        return CapacitorOrientationSolver.issueToString(issue)
      case "VerboseSchematicNetLabel":
        return VerboseNetLabelSolver.issueToString(issue)
      case "PinHeaderSchematicBoxTooWide":
      case "GenericSchematicBoxTooWide":
        return SchematicBoxTooWideSolver.issueToString(issue)
      case "SchematicBoxInnerLabelCollision":
        return SchematicBoxInnerLabelCollisionSolver.issueToString(issue)
      case "SchematicPinPaddingToEdgeTooLarge":
        return SchematicPinPaddingToEdgeSolver.issueToString(issue)
      case "DiodeResistorNotAligned":
        return DiodeResistorAlignmentSolver.issueToString(issue)
      case "NetLabelOrientationUnreadable":
        return NetLabelOrientationSolver.issueToString(issue)
      default:
        return ""
    }
  }

  toString(): string {
    const schematicBoxPlacements = this.lineItems.filter(
      (lineItem): lineItem is SchematicBoxPlacementLineItem =>
        lineItem.lineItemType === "SchematicBoxPlacement",
    )
    const issues = this.lineItems.flatMap((lineItem) =>
      lineItem.lineItemType === "SchematicPlacementIssues"
        ? lineItem.issues
        : [],
    )

    return [
      "<SchematicBoxPositions>",
      ...schematicBoxPlacements.map(this.schematicBoxPlacementsToString),
      "</SchematicBoxPositions>",
      ...(issues.length > 0
        ? [
            "<SchematicPlacementIssues>",
            ...issues.map(this.schematicIssuesToString),
            "</SchematicPlacementIssues>",
          ]
        : []),
    ].join("\n")
  }
}

export const analyzeSchematicPlacement = (
  circuitJson: CircuitJson,
): SchematicPlacementAnalysis => {
  const pipeline = new SchematicPlacementPipeline(circuitJson)
  pipeline.solve()
  const { issues, componentPlacements } = pipeline.getOutput()

  const lineItems: SchematicPlacementLineItem[] = [
    ...componentPlacements,
    ...(issues.length > 0
      ? [{ lineItemType: "SchematicPlacementIssues" as const, issues }]
      : []),
  ]

  return new SchematicPlacementAnalysis(lineItems)
}
