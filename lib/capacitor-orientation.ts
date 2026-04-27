import type { CircuitJson, SchematicComponent } from "circuit-json"
import type { CapacitorSymbolHorizontal, SchematicBoxPlacement } from "./types"

const HORIZONTAL_CAPACITOR_SYMBOL_NAMES = new Set([
  "capacitor_left",
  "capacitor_right",
])

const isSchematicComponent = (
  element: CircuitJson[number],
): element is SchematicComponent => element.type === "schematic_component"

const isSourceCapacitor = (
  circuitJson: CircuitJson,
  sourceComponentId: string | undefined,
): boolean => {
  if (!sourceComponentId) return false

  return circuitJson.some(
    (element) =>
      element.type === "source_component" &&
      element.source_component_id === sourceComponentId &&
      element.ftype === "simple_capacitor",
  )
}

export const generateCapacitorOrientationIssues = (
  componentPlacements: SchematicBoxPlacement[],
  circuitJson: CircuitJson,
): CapacitorSymbolHorizontal[] => {
  const placementBySchematicComponentId = new Map(
    componentPlacements
      .filter((placement) => placement.schematicComponentId)
      .map((placement) => [placement.schematicComponentId!, placement]),
  )

  return circuitJson
    .filter(isSchematicComponent)
    .filter(
      (schematicComponent) =>
        isSourceCapacitor(
          circuitJson,
          schematicComponent.source_component_id,
        ) &&
        HORIZONTAL_CAPACITOR_SYMBOL_NAMES.has(
          schematicComponent.symbol_name ?? "",
        ),
    )
    .flatMap((schematicComponent) => {
      const schematicBox = placementBySchematicComponentId.get(
        schematicComponent.schematic_component_id,
      )

      if (!schematicBox) return []

      return [
        {
          lineItemType: "CapacitorSymbolHorizontal" as const,
          schematicBox,
        },
      ]
    })
}
