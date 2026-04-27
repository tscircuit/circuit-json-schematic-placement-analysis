import type { CircuitJson, SchematicNetLabel } from "circuit-json"
import type { VerboseSchematicNetLabel } from "./types"

export const VERBOSE_NET_LABEL_MESSAGE = "Create <trace /> with schDisplayLabel"

const isSchematicNetLabel = (
  element: CircuitJson[number],
): element is SchematicNetLabel => element.type === "schematic_net_label"

export const generateVerboseNetLabelIssues = (
  circuitJson: CircuitJson,
): VerboseSchematicNetLabel[] =>
  circuitJson.filter(isSchematicNetLabel).flatMap((netLabel) => {
    if (!netLabel.text.includes("/")) return []

    return [
      {
        lineItemType: "VerboseSchematicNetLabel" as const,
        schematicNetLabelId: netLabel.schematic_net_label_id,
        sourceNetId: netLabel.source_net_id,
        text: netLabel.text,
        schX: netLabel.center.x,
        schY: netLabel.center.y,
        message: VERBOSE_NET_LABEL_MESSAGE,
      },
    ]
  })
