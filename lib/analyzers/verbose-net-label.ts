import type { CircuitJson, SchematicNetLabel, SourcePort } from "circuit-json"
import type { VerboseSchematicNetLabel } from "../types"

export const VERBOSE_NET_LABEL_MESSAGE = "Create trace with schDisplayLabel"

const isSchematicNetLabel = (
  element: CircuitJson[number],
): element is SchematicNetLabel => element.type === "schematic_net_label"

const isSourcePort = (element: CircuitJson[number]): element is SourcePort =>
  element.type === "source_port"

interface SourceComponentWithName {
  type: "source_component"
  source_component_id: string
  name: string
}

const getSourceComponentWithName = (
  element: CircuitJson[number],
): SourceComponentWithName | null => {
  if (
    element.type !== "source_component" ||
    !("source_component_id" in element) ||
    !("name" in element) ||
    typeof element.source_component_id !== "string" ||
    typeof element.name !== "string"
  ) {
    return null
  }

  return {
    type: "source_component",
    source_component_id: element.source_component_id,
    name: element.name,
  }
}

const getSourcePortNameCandidates = (sourcePort: SourcePort): string[] =>
  [
    sourcePort.most_frequently_referenced_by_name,
    sourcePort.name,
    ...(sourcePort.port_hints ?? []),
    sourcePort.pin_number === undefined
      ? undefined
      : String(sourcePort.pin_number),
  ].filter((name): name is string => Boolean(name))

const getBestSourcePortName = (sourcePort: SourcePort): string =>
  sourcePort.most_frequently_referenced_by_name ??
  sourcePort.name ??
  (sourcePort.pin_number === undefined ? "" : `pin${sourcePort.pin_number}`)

const getLabelTokenToInvolvedPinMap = (
  circuitJson: CircuitJson,
): Map<string, string> => {
  const sourceComponentById = new Map(
    circuitJson
      .flatMap((element) => {
        const sourceComponent = getSourceComponentWithName(element)
        return sourceComponent ? [sourceComponent] : []
      })
      .map((sourceComponent) => [
        sourceComponent.source_component_id,
        sourceComponent,
      ]),
  )
  const tokenToInvolvedPin = new Map<string, string>()

  for (const sourcePort of circuitJson.filter(isSourcePort)) {
    if (!sourcePort.source_component_id) continue

    const sourceComponent = sourceComponentById.get(
      sourcePort.source_component_id,
    )
    if (!sourceComponent?.name) continue

    const involvedPin = `${sourceComponent.name}.${getBestSourcePortName(sourcePort)}`

    for (const portName of getSourcePortNameCandidates(sourcePort)) {
      tokenToInvolvedPin.set(`${sourceComponent.name}_${portName}`, involvedPin)
    }
  }

  return tokenToInvolvedPin
}

const getInvolvedPins = (
  netLabelText: string,
  tokenToInvolvedPin: Map<string, string>,
): string[] => {
  const involvedPins = new Set<string>()

  for (const token of netLabelText.split("/")) {
    const involvedPin = tokenToInvolvedPin.get(token)
    if (involvedPin) involvedPins.add(involvedPin)
  }

  return Array.from(involvedPins)
}

export const generateVerboseNetLabelIssues = (
  circuitJson: CircuitJson,
): VerboseSchematicNetLabel[] => {
  const tokenToInvolvedPin = getLabelTokenToInvolvedPinMap(circuitJson)
  const issuesByText = new Map<string, VerboseSchematicNetLabel>()

  for (const netLabel of circuitJson.filter(isSchematicNetLabel)) {
    if (!netLabel.text.includes("/")) continue

    if (issuesByText.has(netLabel.text)) continue

    issuesByText.set(netLabel.text, {
      lineItemType: "VerboseSchematicNetLabel" as const,
      schematicNetLabelId: netLabel.schematic_net_label_id,
      sourceNetId: netLabel.source_net_id,
      text: netLabel.text,
      involvedPins: getInvolvedPins(netLabel.text, tokenToInvolvedPin),
      schX: netLabel.center.x,
      schY: netLabel.center.y,
      message: VERBOSE_NET_LABEL_MESSAGE,
    })
  }

  return Array.from(issuesByText.values())
}
