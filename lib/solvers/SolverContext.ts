import type { CircuitJson } from "circuit-json"
import type { SchematicBoxPlacementLineItem } from "../types"

export interface SolverContext {
  circuitJson: CircuitJson
  componentPlacements: SchematicBoxPlacementLineItem[]
}
