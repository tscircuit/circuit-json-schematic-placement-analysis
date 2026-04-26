import type { CircuitJson, SchematicBox } from "circuit-json"
import { generateSchematicPlacementIssues } from "./schematic-box-overlap"
import type {
  SchematicBoxOverlap,
  SchematicBoxPlacementLineItem,
  SchematicPlacementLineItem,
} from "./types"

const fmtNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value)

  return value
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

const isSchematicBox = (
  element: CircuitJson[number],
): element is SchematicBox => element.type === "schematic_box"

const schematicBoxToLineItem = (
  schematicBox: SchematicBox,
): SchematicBoxPlacementLineItem => ({
  lineItemType: "SchematicBoxPlacement",
  positionAnchor: "center",
  schX: schematicBox.x,
  schY: schematicBox.y,
  width: schematicBox.width,
  height: schematicBox.height,
  schematicComponentId: schematicBox.schematic_component_id,
  schematicSymbolId: schematicBox.schematic_symbol_id,
  subcircuitId: schematicBox.subcircuit_id,
})

const lineItemToString = (lineItem: SchematicBoxPlacementLineItem): string => {
  const attrs = [
    `positionAnchor="${lineItem.positionAnchor}"`,
    `schX="${fmtNumber(lineItem.schX)}"`,
    `schY="${fmtNumber(lineItem.schY)}"`,
    `width="${fmtNumber(lineItem.width)}"`,
    `height="${fmtNumber(lineItem.height)}"`,
  ]

  return `<SchematicBoxPlacement ${attrs.join(" ")} />`
}

const overlapIssueToString = (issue: SchematicBoxOverlap): string => {
  const attrs = [
    `firstSchX="${fmtNumber(issue.firstSchematicBox.schX)}"`,
    `firstSchY="${fmtNumber(issue.firstSchematicBox.schY)}"`,
    `secondSchX="${fmtNumber(issue.secondSchematicBox.schX)}"`,
    `secondSchY="${fmtNumber(issue.secondSchematicBox.schY)}"`,
    `overlapCenterSchX="${fmtNumber(issue.overlapCenter.schX)}"`,
    `overlapCenterSchY="${fmtNumber(issue.overlapCenter.schY)}"`,
    `overlapWidth="${fmtNumber(issue.overlapWidth)}"`,
    `overlapHeight="${fmtNumber(issue.overlapHeight)}"`,
  ]

  return `<SchematicBoxOverlap ${attrs.join(" ")} />`
}

export class SchematicPlacementAnalysis {
  constructor(private readonly lineItems: SchematicPlacementLineItem[]) {}

  getLineItems(): SchematicPlacementLineItem[] {
    return this.lineItems
  }

  getString(): string {
    return this.toString()
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
      ...schematicBoxPlacements.map(lineItemToString),
      "</SchematicBoxPositions>",
      ...(issues.length > 0
        ? [
            "<SchematicPlacementIssues>",
            ...issues.map((issue) => {
              switch (issue.lineItemType) {
                case "SchematicBoxOverlap":
                  return overlapIssueToString(issue)
                default:
                  return ""
              }
            }),
            "</SchematicPlacementIssues>",
          ]
        : []),
    ].join("\n")
  }
}

export const analyzeSchematicPlacement = (
  circuitJson: CircuitJson,
): SchematicPlacementAnalysis => {
  const lineItems = circuitJson
    .filter(isSchematicBox)
    .map(schematicBoxToLineItem)
  const issues = generateSchematicPlacementIssues(lineItems)

  return new SchematicPlacementAnalysis([
    ...lineItems,
    ...(issues.length > 0
      ? [{ lineItemType: "SchematicPlacementIssues" as const, issues }]
      : []),
  ])
}
