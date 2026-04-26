import { cju } from "@tscircuit/circuit-json-util"
import type {
  CircuitJson,
  SchematicBox,
  SchematicComponent,
} from "circuit-json"
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

const isSchematicComponent = (
  element: CircuitJson[number],
): element is SchematicComponent => element.type === "schematic_component"

const getSourceComponentName = (
  circuitJson: CircuitJson,
  sourceComponentId: string | undefined,
): string | undefined => {
  if (!sourceComponentId) return undefined

  return cju(circuitJson).source_component.get(sourceComponentId)?.name
}

const schematicComponentToLineItem = (
  schematicComponent: SchematicComponent,
  circuitJson: CircuitJson,
  schematicBox?: SchematicBox,
): SchematicBoxPlacementLineItem => ({
  lineItemType: "SchematicBoxPlacement",
  positionAnchor: "center",
  schX: schematicComponent.center.x,
  schY: schematicComponent.center.y,
  width: schematicBox?.width ?? schematicComponent.size.width,
  height: schematicBox?.height ?? schematicComponent.size.height,
  sourceComponentId: schematicComponent.source_component_id,
  sourceComponentName: getSourceComponentName(
    circuitJson,
    schematicComponent.source_component_id,
  ),
  schematicComponentId: schematicComponent.schematic_component_id,
  schematicSymbolId:
    schematicBox?.schematic_symbol_id ?? schematicComponent.schematic_symbol_id,
  subcircuitId: schematicComponent.subcircuit_id ?? schematicBox?.subcircuit_id,
})

const schematicBoxToLineItem = (
  schematicBox: SchematicBox,
  circuitJson: CircuitJson,
): SchematicBoxPlacementLineItem => ({
  lineItemType: "SchematicBoxPlacement",
  positionAnchor: "center",
  schX: schematicBox.x,
  schY: schematicBox.y,
  width: schematicBox.width,
  height: schematicBox.height,
  ...getSourceComponentMetadata(schematicBox, circuitJson),
  schematicComponentId: schematicBox.schematic_component_id,
  schematicSymbolId: schematicBox.schematic_symbol_id,
  subcircuitId: schematicBox.subcircuit_id,
})

const getSourceComponentMetadata = (
  schematicBox: SchematicBox,
  circuitJson: CircuitJson,
): Pick<
  SchematicBoxPlacementLineItem,
  "sourceComponentId" | "sourceComponentName"
> => {
  if (!schematicBox.schematic_component_id) return {}

  const circuitJsonUtil = cju(circuitJson)
  const schematicComponent = circuitJsonUtil.schematic_component.get(
    schematicBox.schematic_component_id,
  )
  if (!schematicComponent?.source_component_id) return {}

  const sourceComponent = circuitJsonUtil.source_component.get(
    schematicComponent.source_component_id,
  )

  return {
    sourceComponentId: schematicComponent.source_component_id,
    sourceComponentName: sourceComponent?.name,
  }
}

const addAttr = (
  attrs: string[],
  key: string,
  value: string | number | undefined,
) => {
  if (value === undefined) return
  attrs.push(
    `${key}="${typeof value === "number" ? fmtNumber(value) : escapeAttr(value)}"`,
  )
}

const lineItemToString = (lineItem: SchematicBoxPlacementLineItem): string => {
  const attrs: string[] = []

  addAttr(attrs, "componentName", lineItem.sourceComponentName)
  addAttr(attrs, "sourceComponentId", lineItem.sourceComponentId)
  addAttr(attrs, "schematicComponentId", lineItem.schematicComponentId)
  addAttr(attrs, "schematicSymbolId", lineItem.schematicSymbolId)
  addAttr(attrs, "subcircuitId", lineItem.subcircuitId)
  addAttr(attrs, "positionAnchor", lineItem.positionAnchor)
  addAttr(attrs, "schX", lineItem.schX)
  addAttr(attrs, "schY", lineItem.schY)
  addAttr(attrs, "width", lineItem.width)
  addAttr(attrs, "height", lineItem.height)

  return `<SchematicBoxPlacement ${attrs.join(" ")} />`
}

const overlapIssueToString = (issue: SchematicBoxOverlap): string => {
  const attrs: string[] = []

  addAttr(attrs, "component1Name", issue.firstSchematicBox.sourceComponentName)
  addAttr(attrs, "component2Name", issue.secondSchematicBox.sourceComponentName)
  addAttr(
    attrs,
    "component1SchematicComponentId",
    issue.firstSchematicBox.schematicComponentId,
  )
  addAttr(
    attrs,
    "component2SchematicComponentId",
    issue.secondSchematicBox.schematicComponentId,
  )
  addAttr(attrs, "component1SchX", issue.firstSchematicBox.schX)
  addAttr(attrs, "component1SchY", issue.firstSchematicBox.schY)
  addAttr(attrs, "component2SchX", issue.secondSchematicBox.schX)
  addAttr(attrs, "component2SchY", issue.secondSchematicBox.schY)
  addAttr(attrs, "overlapCenterSchX", issue.overlapCenter.schX)
  addAttr(attrs, "overlapCenterSchY", issue.overlapCenter.schY)
  addAttr(attrs, "overlapWidth", issue.overlapWidth)
  addAttr(attrs, "overlapHeight", issue.overlapHeight)

  return `<SchematicBoxOverlap ${attrs.join(" ")} />`
}

const escapeAttr = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

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
  const schematicBoxes = circuitJson.filter(isSchematicBox)
  const schematicComponentIds = new Set(
    circuitJson
      .filter(isSchematicComponent)
      .map((schematicComponent) => schematicComponent.schematic_component_id),
  )
  const lineItems = [
    ...circuitJson.filter(isSchematicComponent).map((schematicComponent) =>
      schematicComponentToLineItem(
        schematicComponent,
        circuitJson,
        schematicBoxes.find(
          (schematicBox) =>
            schematicBox.schematic_component_id ===
            schematicComponent.schematic_component_id,
        ),
      ),
    ),
    ...schematicBoxes
      .filter(
        (schematicBox) =>
          !schematicBox.schematic_component_id ||
          !schematicComponentIds.has(schematicBox.schematic_component_id),
      )
      .map((schematicBox) => schematicBoxToLineItem(schematicBox, circuitJson)),
  ]
  const issues = generateSchematicPlacementIssues(lineItems)

  return new SchematicPlacementAnalysis([
    ...lineItems,
    ...(issues.length > 0
      ? [{ lineItemType: "SchematicPlacementIssues" as const, issues }]
      : []),
  ])
}
