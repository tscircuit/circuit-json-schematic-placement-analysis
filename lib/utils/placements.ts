import { cju } from "@tscircuit/circuit-json-util"
import type {
  CircuitJson,
  SchematicBox,
  SchematicComponent,
} from "circuit-json"
import type {
  SchematicBoxPlacement,
  SchematicBoxPlacementLineItem,
} from "../types"
import type { SolverContext } from "../solvers/SolverContext"

const isSchematicBox = (el: CircuitJson[number]): el is SchematicBox =>
  el.type === "schematic_box"

const isSchematicComponent = (
  el: CircuitJson[number],
): el is SchematicComponent => el.type === "schematic_component"

const getSourceComponentName = (
  circuitJson: CircuitJson,
  sourceComponentId: string | undefined,
): string | undefined => {
  if (!sourceComponentId) return undefined
  return cju(circuitJson).source_component.get(sourceComponentId)?.name
}

const getSourceComponentMetadata = (
  schematicBox: SchematicBox,
  circuitJson: CircuitJson,
): Pick<SchematicBoxPlacement, "sourceComponentId" | "sourceComponentName"> => {
  if (!schematicBox.schematic_component_id) return {}
  const util = cju(circuitJson)
  const sc = util.schematic_component.get(schematicBox.schematic_component_id)
  if (!sc?.source_component_id) return {}
  const sourceComponent = util.source_component.get(sc.source_component_id)
  return {
    sourceComponentId: sc.source_component_id,
    sourceComponentName: sourceComponent?.name,
  }
}

export const schematicComponentToPlacement = (
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

export const schematicBoxToPlacement = (
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

export const buildSolverContext = (circuitJson: CircuitJson): SolverContext => {
  const schematicBoxes = circuitJson.filter(isSchematicBox)
  const schematicComponentIds = new Set(
    circuitJson
      .filter(isSchematicComponent)
      .map((sc) => sc.schematic_component_id),
  )

  const componentPlacements = [
    ...circuitJson.filter(isSchematicComponent).map((sc) =>
      schematicComponentToPlacement(
        sc,
        circuitJson,
        schematicBoxes.find(
          (sb) => sb.schematic_component_id === sc.schematic_component_id,
        ),
      ),
    ),
    ...schematicBoxes
      .filter(
        (sb) =>
          !sb.schematic_component_id ||
          !schematicComponentIds.has(sb.schematic_component_id),
      )
      .map((sb) => schematicBoxToPlacement(sb, circuitJson)),
  ]

  return { circuitJson, componentPlacements }
}
