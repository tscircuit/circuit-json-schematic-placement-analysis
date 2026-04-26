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

export interface SchematicBoxOverlap {
  lineItemType: "SchematicBoxOverlap"
  firstSchematicBox: SchematicBoxPlacement
  secondSchematicBox: SchematicBoxPlacement
  overlapCenter: {
    schX: number
    schY: number
  }
  overlapWidth: number
  overlapHeight: number
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

export type SchematicPlacementIssue =
  | SchematicBoxOverlap
  | SchematicBoxHasALotOfSurroundingWhitespace
  | CapacitorSymbolHorizontal

export interface SchematicPlacementIssues {
  lineItemType: "SchematicPlacementIssues"
  issues: SchematicPlacementIssue[]
}

export type SchematicPlacementLineItem =
  | SchematicBoxPlacementLineItem
  | SchematicPlacementIssues
