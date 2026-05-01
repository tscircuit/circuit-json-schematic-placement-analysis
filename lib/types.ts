export interface SchematicBoxPlacement {
  positionAnchor: "center"
  schX: number
  schY: number
  width: number
  height: number
  sourceComponentId?: string
  sourceComponentName?: string
  schematicComponentId?: string
  schematicSymbolId?: string
  subcircuitId?: string
}

export interface SchematicBoxPlacementLineItem extends SchematicBoxPlacement {
  lineItemType: "SchematicBoxPlacement"
}

export interface ComponentOverlap {
  lineItemType: "ComponentOverlap"
  firstComponent: SchematicBoxPlacement
  secondComponent: SchematicBoxPlacement
  overlapWidth: number
  overlapHeight: number
  correctionSuggestions: OverlapCorrectionSuggestion[]
}

export interface OverlapCorrectionSuggestion {
  targetComponentName?: string
  deltaSchX: number
  deltaSchY: number
  newSchX: number
  newSchY: number
}

export interface SchematicBoxHasALotOfSurroundingWhitespace {
  lineItemType: "SchematicBoxHasALotOfSurroundingWhitespace"
  schematicBox: SchematicBoxPlacement
  whitespaceLeft: number
  whitespaceRight: number
  whitespaceTop: number
  whitespaceBottom: number
}

export interface CapacitorSymbolHorizontal {
  lineItemType: "CapacitorSymbolHorizontal"
  schematicBox: SchematicBoxPlacement
}

export interface VerboseSchematicNetLabel {
  lineItemType: "VerboseSchematicNetLabel"
  schematicNetLabelId?: string
  sourceNetId?: string
  text: string
  involvedPins: string[]
  schX: number
  schY: number
  message: string
}

interface BaseSchematicBoxTooWide {
  schematicBox: SchematicBoxPlacement
  measuredInnerLabelHorizontalEmptySpace: number
  maxAllowedInnerLabelHorizontalEmptySpace: number
  suggestedSchWidth: number
  message: string
}

export interface SchematicBoxTooWideForPinHeader
  extends BaseSchematicBoxTooWide {
  lineItemType: "SchematicBoxTooWideForPinHeader"
}

export interface SchematicBoxTooWideForChip extends BaseSchematicBoxTooWide {
  lineItemType: "SchematicBoxTooWideForChip"
}

export type SchematicBoxTooWide =
  | SchematicBoxTooWideForPinHeader
  | SchematicBoxTooWideForChip

export type SchematicSide = "left" | "right" | "top" | "bottom"

export interface SchematicPinPaddingToEdgeTooLarge {
  lineItemType: "SchematicPinPaddingToEdgeTooLarge"
  pinSide: SchematicSide
  edgeSide: SchematicSide
  pinName?: string
  schematicBox: SchematicBoxPlacement
  measuredPadding: number
  maxAllowedPadding: number
  message: string
}

export type SchematicPlacementIssue =
  | ComponentOverlap
  | SchematicBoxHasALotOfSurroundingWhitespace
  | CapacitorSymbolHorizontal
  | VerboseSchematicNetLabel
  | SchematicBoxTooWide
  | SchematicPinPaddingToEdgeTooLarge

export interface SchematicPlacementIssues {
  lineItemType: "SchematicPlacementIssues"
  issues: SchematicPlacementIssue[]
}

export type SchematicPlacementLineItem =
  | SchematicBoxPlacementLineItem
  | SchematicPlacementIssues
