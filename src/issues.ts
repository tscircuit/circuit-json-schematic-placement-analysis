import type { SchematicBox } from "circuit-json"

export interface SchematicBoxRef {
  index: number
  label: string
  schematic_component_id?: string
  schematic_symbol_id?: string
}

export interface SchematicBoxOverlapIssue {
  type: "schematic_box_overlap"
  message: string
  boxA: SchematicBoxRef
  boxB: SchematicBoxRef
  overlap: {
    width: number
    height: number
    area: number
    center: {
      x: number
      y: number
    }
  }
}

export type SchematicPlacementIssue = SchematicBoxOverlapIssue

export function getSchematicBoxRef(
  box: SchematicBox,
  index: number,
): SchematicBoxRef {
  const label =
    box.schematic_component_id ??
    box.schematic_symbol_id ??
    `schematic_box[${index}]`

  return {
    index,
    label,
    schematic_component_id: box.schematic_component_id,
    schematic_symbol_id: box.schematic_symbol_id,
  }
}
