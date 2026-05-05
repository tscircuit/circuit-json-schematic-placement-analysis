import { cju } from "@tscircuit/circuit-json-util"
import type {
  CircuitJson,
  SchematicBox,
  SchematicComponent,
} from "circuit-json"
import type { SchematicBoxPlacement } from "../utils/types"
import type { AnalyzerContext } from "./AnalyzerContext"

export class SchematicPlacement {
  constructor(private readonly ctx: AnalyzerContext) {}

  createPlacements(): SchematicBoxPlacement[] {
    const circuitJson = this.ctx.circuitJson
    const schematicBoxes = circuitJson.filter(SchematicPlacement.isSchematicBox)
    const schematicComponentIds = new Set(
      circuitJson
        .filter(SchematicPlacement.isSchematicComponent)
        .map((sc) => sc.schematic_component_id),
    )

    return [
      ...circuitJson.filter(SchematicPlacement.isSchematicComponent).map((sc) =>
        SchematicPlacement.schematicComponentToPlacement({
          schematicComponent: sc,
          circuitJson,
          schematicBox: schematicBoxes.find(
            (sb) => sb.schematic_component_id === sc.schematic_component_id,
          ),
        }),
      ),
      ...schematicBoxes
        .filter(
          (sb) =>
            !sb.schematic_component_id ||
            !schematicComponentIds.has(sb.schematic_component_id),
        )
        .map((sb) =>
          SchematicPlacement.schematicBoxToPlacement(sb, circuitJson),
        ),
    ]
  }

  private static isSchematicBox(el: CircuitJson[number]): el is SchematicBox {
    return el.type === "schematic_box"
  }

  private static isSchematicComponent(
    el: CircuitJson[number],
  ): el is SchematicComponent {
    return el.type === "schematic_component"
  }

  private static getSourceComponentName(
    circuitJson: CircuitJson,
    sourceComponentId: string | undefined,
  ): string | undefined {
    if (!sourceComponentId) return undefined
    return cju(circuitJson).source_component.get(sourceComponentId)?.name
  }

  private static schematicComponentToPlacement(input: {
    schematicComponent: SchematicComponent
    circuitJson: CircuitJson
    schematicBox?: SchematicBox
  }): SchematicBoxPlacement {
    const { schematicComponent, circuitJson, schematicBox } = input
    return {
      positionAnchor: "center",
      schX: schematicComponent.center.x,
      schY: schematicComponent.center.y,
      width: schematicBox?.width ?? schematicComponent.size.width,
      height: schematicBox?.height ?? schematicComponent.size.height,
      sourceComponentId: schematicComponent.source_component_id,
      sourceComponentName: SchematicPlacement.getSourceComponentName(
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
  }

  private static schematicBoxToPlacement(
    schematicBox: SchematicBox,
    circuitJson: CircuitJson,
  ): SchematicBoxPlacement {
    let sourceComponentId: string | undefined
    let sourceComponentName: string | undefined

    if (schematicBox.schematic_component_id) {
      const circuitJsonUtil = cju(circuitJson)
      const sc = circuitJsonUtil.schematic_component.get(
        schematicBox.schematic_component_id,
      )
      if (sc?.source_component_id) {
        sourceComponentId = sc.source_component_id
        sourceComponentName = circuitJsonUtil.source_component.get(
          sc.source_component_id,
        )?.name
      }
    }

    return {
      positionAnchor: "center",
      schX: schematicBox.x,
      schY: schematicBox.y,
      width: schematicBox.width,
      height: schematicBox.height,
      sourceComponentId,
      sourceComponentName,
      schematicComponentId: schematicBox.schematic_component_id,
      schematicSymbolId: schematicBox.schematic_symbol_id,
      subcircuitId: schematicBox.subcircuit_id,
    }
  }
}
