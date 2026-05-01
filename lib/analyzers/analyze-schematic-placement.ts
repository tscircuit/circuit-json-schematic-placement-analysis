import { cju } from "@tscircuit/circuit-json-util"
import type {
  CircuitJson,
  SchematicBox,
  SchematicComponent,
} from "circuit-json"
import { generateCapacitorOrientationIssues } from "./capacitor-orientation"
import {
  generateGenericSchematicBoxTooWideIssues,
  generatePinHeaderSchematicBoxTooWideIssues,
  generateSchematicPinPaddingToEdgeTooLargeIssues,
} from "./schematic-box-sizing"
import { generateSchematicPinSpacingIssues } from "./pin-spacing"
import { generateSchematicPlacementIssues } from "./schematic-box-overlap"
import type {
  CapacitorSymbolHorizontal,
  ComponentOverlap,
  OverlapCorrectionSuggestion,
  SchematicPinPaddingToEdgeTooLarge,
  SchematicPinSpacingTooLarge,
  SchematicPinSpacingTooSmall,
  SchematicBoxTooWideIssue,
  SchematicBoxPlacementLineItem,
  SchematicPlacementLineItem,
  VerboseSchematicNetLabel,
} from "../types"
import { generateVerboseNetLabelIssues } from "./verbose-net-label"

const fmtNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value)

  return value
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

const fmtDelta = (value: number): string => {
  const formattedValue = fmtNumber(value)
  return value > 0 ? `+${formattedValue}` : formattedValue
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
  options?: { formatDelta?: boolean; escape?: boolean },
) => {
  if (value === undefined) return
  const stringValue =
    typeof value === "number"
      ? options?.formatDelta
        ? fmtDelta(value)
        : fmtNumber(value)
      : options?.escape === false
        ? value
        : escapeAttr(value)

  attrs.push(`${key}="${stringValue}"`)
}

const lineItemToString = (lineItem: SchematicBoxPlacementLineItem): string => {
  const attrs: string[] = []

  addAttr(attrs, "componentName", lineItem.sourceComponentName)
  addAttr(attrs, "positionAnchor", lineItem.positionAnchor)
  addAttr(attrs, "schX", lineItem.schX)
  addAttr(attrs, "schY", lineItem.schY)
  addAttr(attrs, "width", lineItem.width)
  addAttr(attrs, "height", lineItem.height)

  return `<SchematicBoxPlacement ${attrs.join(" ")} />`
}

const overlapIssueToString = (issue: ComponentOverlap): string => {
  const attrs: string[] = []

  addAttr(attrs, "component1Name", issue.firstComponent.sourceComponentName)
  addAttr(attrs, "component2Name", issue.secondComponent.sourceComponentName)
  addAttr(attrs, "component1SchX", issue.firstComponent.schX)
  addAttr(attrs, "component1SchY", issue.firstComponent.schY)
  addAttr(attrs, "component2SchX", issue.secondComponent.schX)
  addAttr(attrs, "component2SchY", issue.secondComponent.schY)
  addAttr(attrs, "overlapWidth", issue.overlapWidth)
  addAttr(attrs, "overlapHeight", issue.overlapHeight)

  return [
    `<ComponentOverlap ${attrs.join(" ")}>`,
    ...issue.correctionSuggestions.map(correctionSuggestionToString),
    "</ComponentOverlap>",
  ].join("\n")
}

const capacitorSymbolHorizontalIssueToString = (
  issue: CapacitorSymbolHorizontal,
): string => {
  const attrs: string[] = []

  addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
  addAttr(attrs, "schX", issue.schematicBox.schX)
  addAttr(attrs, "schY", issue.schematicBox.schY)
  addAttr(attrs, "width", issue.schematicBox.width)
  addAttr(attrs, "height", issue.schematicBox.height)

  return `<CapacitorSymbolHorizontal ${attrs.join(" ")} />`
}

const verboseSchematicNetLabelIssueToString = (
  issue: VerboseSchematicNetLabel,
): string => {
  const attrs: string[] = []

  addAttr(attrs, "message", issue.message, { escape: false })
  addAttr(attrs, "text", issue.text)
  addAttr(attrs, "involvedPins", issue.involvedPins.join(","))
  addAttr(attrs, "schX", issue.schX)
  addAttr(attrs, "schY", issue.schY)

  return `<VerboseSchematicNetLabel ${attrs.join(" ")} />`
}

const schematicBoxTooWideIssueToString = (
  issue: SchematicBoxTooWideIssue,
): string => {
  const attrs: string[] = []

  addAttr(attrs, "message", issue.message, { escape: false })
  addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
  addAttr(attrs, "currentSchWidth", issue.schematicBox.width)
  addAttr(
    attrs,
    "measuredInnerLabelHorizontalEmptySpace",
    issue.measuredInnerLabelHorizontalEmptySpace,
  )
  addAttr(
    attrs,
    "maxAllowedInnerLabelHorizontalEmptySpace",
    issue.maxAllowedInnerLabelHorizontalEmptySpace,
  )
  addAttr(attrs, "suggestedSchWidth", issue.suggestedSchWidth)

  return `<${issue.lineItemType} ${attrs.join(" ")} />`
}

const schematicPinPaddingToEdgeTooLargeIssueToString = (
  issue: SchematicPinPaddingToEdgeTooLarge,
): string => {
  const attrs: string[] = []

  addAttr(attrs, "message", issue.message, { escape: false })
  addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
  addAttr(attrs, "pinSide", issue.pinSide)
  addAttr(attrs, "edgeSide", issue.edgeSide)
  addAttr(attrs, "pinName", issue.pinName)
  addAttr(attrs, "measuredPadding", issue.measuredPadding)
  addAttr(attrs, "maxAllowedPadding", issue.maxAllowedPadding)

  return `<SchematicPinPaddingToEdgeTooLarge ${attrs.join(" ")} />`
}

const schematicPinSpacingIssueToString = (
  issue: SchematicPinSpacingTooLarge | SchematicPinSpacingTooSmall,
): string => {
  const attrs: string[] = []

  addAttr(attrs, "message", issue.message, { escape: false })
  addAttr(attrs, "componentName", issue.schematicBox.sourceComponentName)
  addAttr(attrs, "measuredSpacing", issue.measuredSpacing)

  if (issue.lineItemType === "SchematicPinSpacingTooLarge") {
    addAttr(attrs, "maxAllowedSpacing", issue.maxAllowedSpacing)
  } else {
    addAttr(attrs, "minAllowedSpacing", issue.minAllowedSpacing)
  }

  return `<${issue.lineItemType} ${attrs.join(" ")} />`
}

const correctionSuggestionToString = (
  suggestion: OverlapCorrectionSuggestion,
): string => {
  const attrs: string[] = []

  addAttr(attrs, "target", suggestion.targetComponentName)
  if (suggestion.deltaSchX !== 0) {
    addAttr(attrs, "newSchX", suggestion.newSchX)
    addAttr(attrs, "deltaSchX", suggestion.deltaSchX, { formatDelta: true })
  }
  if (suggestion.deltaSchY !== 0) {
    addAttr(attrs, "newSchY", suggestion.newSchY)
    addAttr(attrs, "deltaSchY", suggestion.deltaSchY, { formatDelta: true })
  }

  return `<OverlapCorrectionSuggestion ${attrs.join(" ")} />`
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
                case "ComponentOverlap":
                  return overlapIssueToString(issue)
                case "CapacitorSymbolHorizontal":
                  return capacitorSymbolHorizontalIssueToString(issue)
                case "VerboseSchematicNetLabel":
                  return verboseSchematicNetLabelIssueToString(issue)
                case "PinHeaderSchematicBoxTooWide":
                case "GenericSchematicBoxTooWide":
                  return schematicBoxTooWideIssueToString(issue)
                case "SchematicPinPaddingToEdgeTooLarge":
                  return schematicPinPaddingToEdgeTooLargeIssueToString(issue)
                case "SchematicPinSpacingTooLarge":
                case "SchematicPinSpacingTooSmall":
                  return schematicPinSpacingIssueToString(issue)
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
  const issues = [
    ...generateSchematicPlacementIssues(lineItems),
    ...generateCapacitorOrientationIssues(lineItems, circuitJson),
    ...generateVerboseNetLabelIssues(circuitJson),
    ...generatePinHeaderSchematicBoxTooWideIssues(lineItems, circuitJson),
    ...generateGenericSchematicBoxTooWideIssues(lineItems, circuitJson),
    ...generateSchematicPinPaddingToEdgeTooLargeIssues(lineItems, circuitJson),
    ...generateSchematicPinSpacingIssues(lineItems, circuitJson),
  ]

  return new SchematicPlacementAnalysis([
    ...lineItems,
    ...(issues.length > 0
      ? [{ lineItemType: "SchematicPlacementIssues" as const, issues }]
      : []),
  ])
}
