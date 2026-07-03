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
import { getSchematicSheetNameByIdMap } from "./schematic-sheets"

const isSchematicBox = (el: CircuitJson[number]): el is SchematicBox =>
  el.type === "schematic_box"

const isSchematicComponent = (
  el: CircuitJson[number],
): el is SchematicComponent => el.type === "schematic_component"

const getSchematicSheetId = (
  el: Pick<SchematicBox | SchematicComponent, "schematic_sheet_id">,
): string | undefined => el.schematic_sheet_id

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
  schematicSheetNameById: Map<string, string>,
  schematicBox?: SchematicBox,
): SchematicBoxPlacementLineItem => {
  let schematicSheetId = getSchematicSheetId(schematicComponent)
  if (schematicSheetId === undefined && schematicBox) {
    schematicSheetId = getSchematicSheetId(schematicBox)
  }

  let schematicSheetName: string | undefined
  if (schematicSheetId) {
    schematicSheetName = schematicSheetNameById.get(schematicSheetId)
  }

  const placement: SchematicBoxPlacementLineItem = {
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
      schematicBox?.schematic_symbol_id ??
      schematicComponent.schematic_symbol_id,
    subcircuitId:
      schematicComponent.subcircuit_id ?? schematicBox?.subcircuit_id,
  }
  if (schematicSheetId) {
    placement.schematicSheetId = schematicSheetId
  }
  if (schematicSheetName) {
    placement.schematicSheetName = schematicSheetName
  }
  return placement
}

export const schematicBoxToPlacement = (
  schematicBox: SchematicBox,
  circuitJson: CircuitJson,
  schematicSheetNameById: Map<string, string>,
): SchematicBoxPlacementLineItem => {
  const schematicSheetId = getSchematicSheetId(schematicBox)
  let schematicSheetName: string | undefined
  if (schematicSheetId) {
    schematicSheetName = schematicSheetNameById.get(schematicSheetId)
  }

  const placement: SchematicBoxPlacementLineItem = {
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
  }
  if (schematicSheetId) {
    placement.schematicSheetId = schematicSheetId
  }
  if (schematicSheetName) {
    placement.schematicSheetName = schematicSheetName
  }
  return placement
}

export const buildSolverContext = (circuitJson: CircuitJson): SolverContext => {
  const schematicBoxes = circuitJson.filter(isSchematicBox)
  const schematicSheetNameById = getSchematicSheetNameByIdMap(circuitJson)
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
        schematicSheetNameById,
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
      .map((sb) =>
        schematicBoxToPlacement(sb, circuitJson, schematicSheetNameById),
      ),
  ]

  return { circuitJson, componentPlacements }
}
