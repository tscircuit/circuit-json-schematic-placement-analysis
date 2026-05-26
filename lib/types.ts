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

export interface PinHeaderSchematicBoxTooWide extends BaseSchematicBoxTooWide {
  lineItemType: "PinHeaderSchematicBoxTooWide"
}

export interface GenericSchematicBoxTooWide extends BaseSchematicBoxTooWide {
  lineItemType: "GenericSchematicBoxTooWide"
}

export type SchematicBoxTooWideIssue =
  | PinHeaderSchematicBoxTooWide
  | GenericSchematicBoxTooWide

export interface SchematicBoxInnerLabelCollision {
  lineItemType: "SchematicBoxInnerLabelCollision"
  schematicBox: SchematicBoxPlacement
  overlappingSides: SchematicSide[]
  message: string
}

export type SchematicSide = "left" | "right" | "top" | "bottom"

export interface SchematicPinPaddingToEdgeTooLarge {
  lineItemType: "SchematicPinPaddingToEdgeTooLarge"
  pinSide: SchematicSide
  edgeSide: SchematicSide
  pinName?: string
  schematicBox: SchematicBoxPlacement
  measuredPadding: number
  maxAllowedPadding: number
  excessPadding: number
  suggestedSchWidth?: number
  suggestedSchHeight?: number
  message: string
}

export interface DiodeResistorNotAligned {
  lineItemType: "DiodeResistorNotAligned"
  diodeSchematicBox: SchematicBoxPlacement
  resistorSchematicBox: SchematicBoxPlacement
  diodePin?: string
  resistorPin?: string
  diodePinFacingDirection?: string
  resistorPinFacingDirection?: string
  message: string
}

export interface ComponentNetLabelCollision {
  lineItemType: "ComponentNetLabelCollision"
  firstComponent: SchematicBoxPlacement
  secondComponent: SchematicBoxPlacement
  message: string
  overlappingLabel1Bounds: { left: number; right: number; top: number; bottom: number }
  overlappingLabel2Bounds: { left: number; right: number; top: number; bottom: number }
  suggestion?: {
    componentName: string
    newSchX: number
    newSchY: number
  }
}

export interface ComponentBoxNetLabelCollision {
  lineItemType: "ComponentBoxNetLabelCollision"
  boxComponent: SchematicBoxPlacement
  labelComponent: SchematicBoxPlacement
  message: string
  boxBounds: { left: number; right: number; top: number; bottom: number }
  labelBounds: { left: number; right: number; top: number; bottom: number }
  suggestion?: {
    componentName: string
    newSchX: number
    newSchY: number
  }
}

export interface NetLabelCollision {
  lineItemType: "NetLabelCollision"
  pairs: Array<{ comp1Name: string; comp2Name: string }>
  moves: Array<{
    componentName: string
    newSchX: number
    newSchY: number
  }>
}

export type SchematicPlacementIssue =
  | ComponentOverlap
  | SchematicBoxHasALotOfSurroundingWhitespace
  | CapacitorSymbolHorizontal
  | VerboseSchematicNetLabel
  | SchematicBoxTooWideIssue
  | SchematicBoxInnerLabelCollision
  | SchematicPinPaddingToEdgeTooLarge
  | DiodeResistorNotAligned
  | ComponentNetLabelCollision
  | ComponentBoxNetLabelCollision
  | NetLabelCollision

export interface SchematicPlacementIssues {
  lineItemType: "SchematicPlacementIssues"
  issues: SchematicPlacementIssue[]
}

export type SchematicPlacementLineItem =
  | SchematicBoxPlacementLineItem
  | SchematicPlacementIssues
