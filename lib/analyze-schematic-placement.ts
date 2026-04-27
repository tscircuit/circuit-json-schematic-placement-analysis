import type {
  CircuitJson,
  SchematicBox,
  SchematicComponent,
  SchematicSymbol,
  SourceSimpleCapacitor,
} from "circuit-json"
import type {
  CapacitorSymbolHorizontal,
  SchematicBoxPlacement,
  SchematicBoxPlacementLineItem,
  SchematicPlacementIssue,
  SchematicPlacementIssues,
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

const isSchematicComponent = (
  element: CircuitJson[number],
): element is SchematicComponent => element.type === "schematic_component"

const isSchematicSymbol = (
  element: CircuitJson[number],
): element is SchematicSymbol => element.type === "schematic_symbol"

const isSourceSimpleCapacitor = (
  element: CircuitJson[number],
): element is SourceSimpleCapacitor =>
  element.type === "source_component" && element.ftype === "simple_capacitor"

const isCapacitorSymbolName = (symbolName: string | undefined): boolean =>
  symbolName?.toLowerCase().includes("capacitor") ?? false

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

const schematicBoxToPlacement = (
  schematicBox: SchematicBox,
): SchematicBoxPlacement => {
  const { lineItemType: _lineItemType, ...placement } =
    schematicBoxToLineItem(schematicBox)

  return placement
}

const placementAttrsToString = (placement: SchematicBoxPlacement): string => {
  const attrs = [
    `positionAnchor="${placement.positionAnchor}"`,
    `schX="${fmtNumber(placement.schX)}"`,
    `schY="${fmtNumber(placement.schY)}"`,
    `width="${fmtNumber(placement.width)}"`,
    `height="${fmtNumber(placement.height)}"`,
  ]

  return attrs.join(" ")
}

const lineItemToString = (lineItem: SchematicBoxPlacementLineItem): string => {
  const attrs = placementAttrsToString(lineItem)

  return `<SchematicBoxPlacement ${attrs} />`
}

const issueToString = (issue: SchematicPlacementIssue): string => {
  switch (issue.lineItemType) {
    case "CapacitorSymbolHorizontal":
      return `<CapacitorSymbolHorizontal ${placementAttrsToString(issue.schematicBox)} />`
    case "SchematicBoxOverlap":
      return "<SchematicBoxOverlap />"
    case "SchematicBoxHasALotOfSurroundingWhitespace":
      return "<SchematicBoxHasALotOfSurroundingWhitespace />"
    default:
      return ""
  }
}

const issuesToString = (lineItem: SchematicPlacementIssues): string =>
  [
    "<SchematicPlacementIssues>",
    ...lineItem.issues.map(issueToString),
    "</SchematicPlacementIssues>",
  ].join("\n")

const findCapacitorOrientationIssues = (
  circuitJson: CircuitJson,
): CapacitorSymbolHorizontal[] => {
  const sourceCapacitorIds = new Set(
    circuitJson
      .filter(isSourceSimpleCapacitor)
      .map((sourceComponent) => sourceComponent.source_component_id),
  )
  const schematicSymbolsById = new Map(
    circuitJson
      .filter(isSchematicSymbol)
      .map((schematicSymbol) => [
        schematicSymbol.schematic_symbol_id,
        schematicSymbol,
      ]),
  )
  const schematicComponentsById = new Map(
    circuitJson
      .filter(isSchematicComponent)
      .map((schematicComponent) => [
        schematicComponent.schematic_component_id,
        schematicComponent,
      ]),
  )

  return circuitJson
    .filter(isSchematicBox)
    .filter((schematicBox) => schematicBox.width > schematicBox.height)
    .filter((schematicBox) => {
      const schematicComponent = schematicBox.schematic_component_id
        ? schematicComponentsById.get(schematicBox.schematic_component_id)
        : undefined
      const schematicSymbolId =
        schematicBox.schematic_symbol_id ??
        schematicComponent?.schematic_symbol_id
      const schematicSymbol = schematicSymbolId
        ? schematicSymbolsById.get(schematicSymbolId)
        : undefined

      return (
        (schematicComponent?.source_component_id !== undefined &&
          sourceCapacitorIds.has(schematicComponent.source_component_id)) ||
        isCapacitorSymbolName(schematicComponent?.symbol_name) ||
        isCapacitorSymbolName(schematicSymbol?.name)
      )
    })
    .map((schematicBox) => ({
      lineItemType: "CapacitorSymbolHorizontal",
      schematicBox: schematicBoxToPlacement(schematicBox),
    }))
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
    return [
      "<SchematicBoxPositions>",
      ...this.lineItems.map((lineItem) => {
        switch (lineItem.lineItemType) {
          case "SchematicBoxPlacement":
            return lineItemToString(lineItem)
          case "SchematicPlacementIssues":
            return issuesToString(lineItem)
          default:
            return ""
        }
      }),
      "</SchematicBoxPositions>",
    ].join("\n")
  }
}

export const analyzeSchematicPlacement = (
  circuitJson: CircuitJson,
): SchematicPlacementAnalysis => {
  const lineItems: SchematicPlacementLineItem[] = circuitJson
    .filter(isSchematicBox)
    .map(schematicBoxToLineItem)
  const issues = findCapacitorOrientationIssues(circuitJson)

  if (issues.length > 0) {
    lineItems.push({
      lineItemType: "SchematicPlacementIssues",
      issues,
    })
  }

  return new SchematicPlacementAnalysis(lineItems)
}
