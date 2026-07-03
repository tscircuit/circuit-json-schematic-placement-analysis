import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

const POWER_SHEET_ID = "schematic_sheet_power"
const LOGIC_SHEET_ID = "schematic_sheet_logic"

const powerComponentNames = new Set(["RP1", "CP1", "UP1", "UP2"])
const logicComponentNames = new Set(["RL1", "CL1", "UL1", "UL2"])

function getSheetIdForComponentName(componentName: string) {
  if (powerComponentNames.has(componentName)) return POWER_SHEET_ID
  if (logicComponentNames.has(componentName)) return LOGIC_SHEET_ID
  return undefined
}

function addSchematicSheets(circuitJson: CircuitJson) {
  circuitJson.unshift(
    {
      type: "schematic_sheet",
      schematic_sheet_id: POWER_SHEET_ID,
      name: "Power",
      sheet_index: 0,
      center: { x: -3.9, y: 0.7 },
    } as CircuitJson[number],
    {
      type: "schematic_sheet",
      schematic_sheet_id: LOGIC_SHEET_ID,
      name: "Logic",
      sheet_index: 1,
      center: { x: 1.6, y: 0.7 },
    } as CircuitJson[number],
  )
}

function assignSchematicSheets(circuitJson: CircuitJson) {
  const sourceComponentNameById = new Map<string, string>()
  const sourcePortSheetIdById = new Map<string, string>()
  const sourceTraceSheetIdById = new Map<string, string>()
  const connectivityKeySheetId = new Map<string, string>()

  for (const element of circuitJson) {
    if (element.type === "source_component") {
      if (!element.name) continue
      sourceComponentNameById.set(element.source_component_id, element.name)
    }
  }

  for (const element of circuitJson) {
    if (element.type !== "source_port") continue
    if (!element.source_component_id) continue
    const sourceComponentName = sourceComponentNameById.get(
      element.source_component_id,
    )
    if (!sourceComponentName) continue
    const sheetId = getSheetIdForComponentName(sourceComponentName)
    if (sheetId) sourcePortSheetIdById.set(element.source_port_id, sheetId)
  }

  for (const element of circuitJson) {
    if (element.type !== "source_trace") continue
    const sheetId = element.connected_source_port_ids
      .map((sourcePortId) => sourcePortSheetIdById.get(sourcePortId))
      .find((id): id is string => Boolean(id))
    if (!sheetId) continue
    sourceTraceSheetIdById.set(element.source_trace_id, sheetId)
    if (element.subcircuit_connectivity_map_key) {
      connectivityKeySheetId.set(
        element.subcircuit_connectivity_map_key,
        sheetId,
      )
    }
  }

  for (const element of circuitJson) {
    const elementWithSheet = element as typeof element & {
      schematic_sheet_id?: string
    }

    if (element.type === "schematic_component") {
      if (!element.source_component_id) continue
      const sourceComponentName = sourceComponentNameById.get(
        element.source_component_id,
      )
      if (!sourceComponentName) continue
      elementWithSheet.schematic_sheet_id =
        getSheetIdForComponentName(sourceComponentName)
      continue
    }

    if (element.type === "schematic_port") {
      elementWithSheet.schematic_sheet_id = sourcePortSheetIdById.get(
        element.source_port_id,
      )
      continue
    }

    if (element.type === "schematic_trace") {
      if (!element.source_trace_id) continue
      elementWithSheet.schematic_sheet_id =
        sourceTraceSheetIdById.get(element.source_trace_id) ??
        connectivityKeySheetId.get(
          element.subcircuit_connectivity_map_key ?? "",
        )
      continue
    }

    if (element.type === "schematic_net_label") {
      const firstComponentName = element.text.split("_")[0]
      if (!firstComponentName) continue
      elementWithSheet.schematic_sheet_id =
        getSheetIdForComponentName(firstComponentName) ??
        connectivityKeySheetId.get(element.source_net_id)
    }
  }
}

export async function createMultiSheetVerboseNetLabelCircuitJson(): Promise<CircuitJson> {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm" routingDisabled schAutoLayoutEnabled>
      <resistor
        resistance="1k"
        footprint="0402"
        name="RP1"
        schX="-4.4"
        schY="1.7"
      />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="CP1"
        schX="-2.23"
        schY="2.1"
        connections={{ pin1: "RP1.pin1" }}
      />
      <chip
        footprint="soic8"
        name="UP1"
        schX="-1.58"
        schY="0"
        connections={{ pin1: "CP1.pin2", pin2: "RP1.pin2" }}
      />
      <chip
        footprint="soic8"
        name="UP2"
        schX="-4.86"
        schY="-0.4"
        connections={{ pin1: "UP1.pin3", pin2: "UP1.pin4" }}
      />
      <resistor
        resistance="2k"
        footprint="0402"
        name="RL1"
        schX="1.1"
        schY="1.7"
      />
      <capacitor
        capacitance="2200pF"
        footprint="0402"
        name="CL1"
        schX="3.27"
        schY="2.1"
        connections={{ pin1: "RL1.pin1" }}
      />
      <chip
        footprint="soic8"
        name="UL1"
        schX="3.92"
        schY="0"
        connections={{ pin1: "CL1.pin2", pin2: "RL1.pin2" }}
      />
      <chip
        footprint="soic8"
        name="UL2"
        schX="0.64"
        schY="-0.4"
        connections={{ pin1: "UL1.pin3", pin2: "UL1.pin4" }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  assignSchematicSheets(circuitJson)
  addSchematicSheets(circuitJson)

  return circuitJson
}
