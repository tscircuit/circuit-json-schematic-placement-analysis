import type { CircuitJson } from "circuit-json"
import type {
  SchematicBoxPlacementLineItem,
  SchematicPlacementLineItem,
} from "../utils/types"
import type { AnalyzerContext } from "./AnalyzerContext"
import { CapacitorOrientationAnalyzer } from "./CapacitorOrientationAnalyzer"
import { ComponentOverlapAnalyzer } from "./ComponentOverlapAnalyzer"
import { PinPaddingToEdgeAnalyzer } from "./PinPaddingToEdgeAnalyzer"
import { SchematicAnalysisPipeline } from "./Pipeline"
import { SchematicBoxTooWideAnalyzer } from "./SchematicBoxTooWideAnalyzer"
import { VerboseNetLabelAnalyzer } from "./VerboseNetLabelAnalyzer"

export class SchematicPlacementAnalysis {
  constructor(private readonly lineItems: SchematicPlacementLineItem[]) {}

  static analyze(circuitJson: CircuitJson): SchematicPlacementAnalysis {
    const ctx: AnalyzerContext = { circuitJson }
    const pipeline = new SchematicAnalysisPipeline(ctx).solve()
    return new this(pipeline.getLineItems())
  }

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
      ...schematicBoxPlacements.map((lineItem) =>
        SchematicPlacementAnalysis.lineItemToString(lineItem),
      ),
      "</SchematicBoxPositions>",
      ...(issues.length > 0
        ? [
            "<SchematicPlacementIssues>",
            ...issues.map((issue) => {
              switch (issue.lineItemType) {
                case "ComponentOverlap":
                  return ComponentOverlapAnalyzer.toString(issue)
                case "CapacitorSymbolHorizontal":
                  return CapacitorOrientationAnalyzer.toString(issue)
                case "VerboseSchematicNetLabel":
                  return VerboseNetLabelAnalyzer.toString(issue)
                case "PinHeaderSchematicBoxTooWide":
                case "GenericSchematicBoxTooWide":
                  return SchematicBoxTooWideAnalyzer.toString(issue)
                case "SchematicPinPaddingToEdgeTooLarge":
                  return PinPaddingToEdgeAnalyzer.toString(issue)
                default:
                  return ""
              }
            }),
            "</SchematicPlacementIssues>",
          ]
        : []),
    ].join("\n")
  }

  private static lineItemToString(
    lineItem: SchematicBoxPlacementLineItem,
  ): string {
    const attrs: string[] = []
    this.addAttr({
      attrs,
      key: "componentName",
      value: lineItem.sourceComponentName,
    })
    this.addAttr({
      attrs,
      key: "positionAnchor",
      value: lineItem.positionAnchor,
    })
    this.addAttr({ attrs, key: "schX", value: lineItem.schX })
    this.addAttr({ attrs, key: "schY", value: lineItem.schY })
    this.addAttr({ attrs, key: "width", value: lineItem.width })
    this.addAttr({ attrs, key: "height", value: lineItem.height })
    return `<SchematicBoxPlacement ${attrs.join(" ")} />`
  }

  private static addAttr(input: {
    attrs: string[]
    key: string
    value: string | number | undefined
    options?: { formatDelta?: boolean; escape?: boolean }
  }): void {
    const { attrs, key, value, options } = input
    if (value === undefined) return
    const stringValue =
      typeof value === "number"
        ? options?.formatDelta
          ? this.fmtDelta(value)
          : this.fmtNumber(value)
        : options?.escape === false
          ? value
          : this.escapeAttr(value)
    attrs.push(`${key}="${stringValue}"`)
  }

  private static fmtNumber(value: number): string {
    if (Number.isInteger(value)) return String(value)
    return value
      .toFixed(3)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1")
  }

  private static fmtDelta(value: number): string {
    const formatted = this.fmtNumber(value)
    return value > 0 ? `+${formatted}` : formatted
  }

  private static escapeAttr(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
  }
}

export const analyzeSchematicPlacement = (
  circuitJson: CircuitJson,
): SchematicPlacementAnalysis => SchematicPlacementAnalysis.analyze(circuitJson)
