export interface SchematicBoxPlacement {
  positionAnchor: "center"
  schX: number
  schY: number
  width: number
  height: number
  schematicSheetId?: string
  schematicSheetName?: string
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
  message: string
}

export interface VerboseSchematicNetLabel {
  lineItemType: "VerboseSchematicNetLabel"
  schematicNetLabelId?: string
  sourceNetId?: string
  schematicSheetId?: string
  schematicSheetName?: string
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

export type SchematicPortFacingDirection = "left" | "right" | "up" | "down"

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

export interface ComponentPinsWouldAlignWithVerticalShift {
  lineItemType: "ComponentPinsWouldAlignWithVerticalShift"
  firstComponent: SchematicBoxPlacement
  secondComponent: SchematicBoxPlacement
  targetComponent: SchematicBoxPlacement
  deltaSchY: number
  newSchY: number
  currentlyAlignedPinCount: number
  alignedPinCount: number
  alignedPinPairs: Array<{
    firstPin?: string
    secondPin?: string
  }>
  message: string
}

export interface TraceCanBeSimplifiedByMovingComponent {
  lineItemType: "TraceCanBeSimplifiedByMovingComponent"
  schematicTraceId: string
  targetComponent: SchematicBoxPlacement
  deltaSchX: number
  deltaSchY: number
  newSchX: number
  newSchY: number
  currentTurnCount: number
  suggestedTurnCount: number
  message: string
}

export interface CrystalNotCenteredOverLoadCapacitors {
  lineItemType: "CrystalNotCenteredOverLoadCapacitors"
  crystalSchematicBox: SchematicBoxPlacement
  firstLoadCapacitorSchematicBox: SchematicBoxPlacement
  secondLoadCapacitorSchematicBox: SchematicBoxPlacement
  deltaSchX: number
  deltaSchY: number
  newSchX: number
  newSchY: number
  message: string
}

export interface TwoPinComponentCouldBeFlipped {
  lineItemType: "TwoPinComponentCouldBeFlipped"
  schematicTraceId: string
  targetComponent: SchematicBoxPlacement
  connectedComponent: SchematicBoxPlacement
  targetPin?: string
  currentFacingDirection: SchematicPortFacingDirection
  suggestedFacingDirection: SchematicPortFacingDirection
  deltaSchRotation: 180
  currentTurnCount: number
  suggestedTurnCount: number
  message: string
}

/** Advisory: a direct negative-feedback R/C network is far from its amplifier. */
export interface FeedbackNetworkNotCompact {
  lineItemType: "FeedbackNetworkNotCompact"
  amplifierSchematicBox: SchematicBoxPlacement
  feedbackComponents: SchematicBoxPlacement[]
  distantComponents: Array<{
    schematicBox: SchematicBoxPlacement
    bodyGap: number
    maxRecommendedBodyGap: number
  }>
  outputSourcePortId: string
  invertingInputSourcePortId: string
  message: string
}

/** Advisory: an explicitly identified pull resistor is far on the unconventional side. */
export interface PullResistorOnWrongSide {
  lineItemType: "PullResistorOnWrongSide"
  resistorSchematicBox: SchematicBoxPlacement
  hostSchematicBox: SchematicBoxPlacement
  signalSourcePortId: string
  signalPinName: string
  signalSchY: number
  pullDirection: "up" | "down"
  preferredSide: "above" | "below"
  wrongSideGap: number
  maxRecommendedWrongSideGap: number
  message: string
}

export interface TwoPinComponentShouldBeVertical {
  lineItemType: "TwoPinComponentShouldBeVertical"
  schematicBox: SchematicBoxPlacement
  railSourcePortId: string
  railPinName: string
  railType: "power" | "ground"
  deltaSchRotation: -90 | 90
  suggestedRailFacingDirection: "up" | "down"
  message: string
}

export interface ComponentNetLabelCollision {
  lineItemType: "ComponentNetLabelCollision"
  firstComponent: SchematicBoxPlacement
  secondComponent: SchematicBoxPlacement
  message: string
  overlappingLabel1Bounds: {
    left: number
    right: number
    top: number
    bottom: number
  }
  overlappingLabel2Bounds: {
    left: number
    right: number
    top: number
    bottom: number
  }
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

export interface SchematicIssueBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export interface NetLabelCollision {
  lineItemType: "NetLabelCollision"
  schematicSheetId?: string
  schematicSheetName?: string
  /** Actual intersection regions in schematic coordinates (Y up).
   * Optional for compatibility with previously serialized reports. */
  collisionBounds?: SchematicIssueBounds[]
  pairs: Array<{ comp1Name: string; comp2Name: string }>
  moves: Array<{
    componentName: string
    newSchX: number
    newSchY: number
  }>
}

export interface SchematicTextCollisionObject {
  type: "text" | "trace" | "component"
  id: string
  text?: string
  componentName?: string
  schematicComponentId?: string
}

export interface SchematicTextCollision {
  lineItemType: "SchematicTextCollision"
  schematicSheetId?: string
  schematicSheetName?: string
  schematicTextId: string
  text: string
  collidingObject: SchematicTextCollisionObject
  textBounds: { left: number; right: number; top: number; bottom: number }
  collidingObjectBounds: {
    left: number
    right: number
    top: number
    bottom: number
  }
  /** A clear text-anchor position for this issue; reanalyze after applying it. */
  suggestedMove?: { newSchX: number; newSchY: number }
  message: string
}

export interface ResetNetworkNotGrouped {
  lineItemType: "ResetNetworkNotGrouped"
  /** The component whose reset pin is served by this network. */
  hostSchematicBox: SchematicBoxPlacement
  resetSourcePortId: string
  resetPinName: string
  /** Reset pull-up, capacitor, and any associated test points; excludes the host. */
  supportNetworkComponents: SchematicBoxPlacement[]
  maxDistanceFromResetPin: number
  maxRecommendedDistance: number
  message: string
}

export interface BuckConverterNetworkNotGrouped {
  lineItemType: "BuckConverterNetworkNotGrouped"
  regulatorSchematicBox: SchematicBoxPlacement
  /** Inductor, feedback divider and any local bootstrap capacitor/catch diode. */
  supportNetworkComponents: SchematicBoxPlacement[]
  distantComponents: Array<{
    schematicBox: SchematicBoxPlacement
    role:
      | "output_inductor"
      | "feedback_resistor"
      | "bootstrap_capacitor"
      | "catch_diode"
    regulatorSourcePortId: string
    regulatorPinName: string
    distanceFromRegulatorPin: number
    maxRecommendedDistance: number
  }>
  message: string
}

export interface ConnectorPositionCausesTraceDetours {
  lineItemType: "ConnectorPositionCausesTraceDetours"
  connectorSchematicBox: SchematicBoxPlacement
  connectedComponents: SchematicBoxPlacement[]
  /** Existing routed signal connections that demonstrate the detours. */
  schematicTraceIds: string[]
  evaluatedSignalCount: number
  newSchX: number
  newSchY: number
  deltaSchX: number
  deltaSchY: number
  /** Sum of Manhattan distances between the evaluated signal pins. */
  currentTotalSignalDistance: number
  /** Sum of Manhattan pin distances after moving; not a promised routed length. */
  suggestedTotalSignalDistance: number
  message: string
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
  | ComponentPinsWouldAlignWithVerticalShift
  | TraceCanBeSimplifiedByMovingComponent
  | CrystalNotCenteredOverLoadCapacitors
  | TwoPinComponentCouldBeFlipped
  | FeedbackNetworkNotCompact
  | PullResistorOnWrongSide
  | TwoPinComponentShouldBeVertical
  | ComponentNetLabelCollision
  | ComponentBoxNetLabelCollision
  | NetLabelCollision
  | SchematicTextCollision
  | ResetNetworkNotGrouped
  | BuckConverterNetworkNotGrouped
  | ConnectorPositionCausesTraceDetours

export interface SchematicPlacementIssues {
  lineItemType: "SchematicPlacementIssues"
  issues: SchematicPlacementIssue[]
}

export type SchematicPlacementLineItem =
  | SchematicBoxPlacementLineItem
  | SchematicPlacementIssues
