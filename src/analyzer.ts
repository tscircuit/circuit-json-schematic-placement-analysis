import type { AnyCircuitElement } from "circuit-json"
import { generateSchematicBoxOverlapIssues } from "./schematic-box-overlap"
import type { SchematicPlacementIssue } from "./issues"

export class SchematicPlacementAnalyzer {
  readonly circuitJson: AnyCircuitElement[]
  readonly issues: SchematicPlacementIssue[]

  constructor(circuitJson: AnyCircuitElement[]) {
    this.circuitJson = circuitJson
    this.issues = generateSchematicBoxOverlapIssues(circuitJson)
  }

  get hasIssues(): boolean {
    return this.issues.length > 0
  }

  toString(): string {
    if (!this.hasIssues) {
      return "No schematic placement issues found."
    }

    return this.issues
      .map((issue, index) => {
        switch (issue.type) {
          case "schematic_box_overlap":
            return [
              `${index + 1}. schematic_box_overlap`,
              `   ${issue.message}`,
              `   boxes: ${issue.boxA.label}, ${issue.boxB.label}`,
              `   overlap center: (${formatNumber(issue.overlap.center.x)}, ${formatNumber(issue.overlap.center.y)})`,
            ].join("\n")
        }
      })
      .join("\n")
  }
}

export function analyzeSchematicPlacement(
  circuitJson: AnyCircuitElement[],
): SchematicPlacementAnalyzer {
  return new SchematicPlacementAnalyzer(circuitJson)
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}
