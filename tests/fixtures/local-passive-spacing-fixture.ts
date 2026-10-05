import { expect } from "bun:test"
import type { CircuitJson, SchematicComponent, SourcePort } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "./create-schematic-analysis-fixture-svg"

export function createLocalPassiveSpacingFixture(pinDistance = 6): CircuitJson {
  return [
    {
      type: "source_component",
      source_component_id: "host",
      ftype: "simple_chip",
      name: "U1",
      source_group_id: "block",
      subcircuit_id: "scope",
    },
    {
      type: "source_component",
      source_component_id: "passive",
      ftype: "simple_resistor",
      resistance: 10000,
      name: "R1",
      source_group_id: "block",
      subcircuit_id: "scope",
    },
    {
      type: "source_port",
      source_port_id: "host_signal",
      source_component_id: "host",
      name: "anonymous",
      port_hints: [],
    },
    {
      type: "source_port",
      source_port_id: "passive_signal",
      source_component_id: "passive",
      name: "terminal_a",
      port_hints: [],
    },
    {
      type: "source_port",
      source_port_id: "passive_other",
      source_component_id: "passive",
      name: "terminal_b",
      port_hints: [],
    },
    {
      type: "source_trace",
      source_trace_id: "connection",
      connected_source_port_ids: ["host_signal", "passive_signal"],
      connected_source_net_ids: [],
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_host",
      source_component_id: "host",
      schematic_group_id: "sch_block",
      subcircuit_id: "scope",
      center: { x: -1.3, y: 0 },
      size: { width: 2, height: 2 },
      is_box_with_pins: true,
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_passive",
      source_component_id: "passive",
      schematic_group_id: "sch_block",
      subcircuit_id: "scope",
      center: { x: pinDistance + 0.75, y: 0 },
      size: { width: 0.9, height: 0.6 },
      is_box_with_pins: true,
      symbol_name: "boxresistor_right",
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_host_signal",
      schematic_component_id: "sch_host",
      source_port_id: "host_signal",
      center: { x: 0, y: 0 },
      side_of_component: "right",
      facing_direction: "right",
      distance_from_component_edge: 0.3,
      true_ccw_index: 0,
      pin_number: 1,
      is_connected: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_passive_signal",
      schematic_component_id: "sch_passive",
      source_port_id: "passive_signal",
      center: { x: pinDistance, y: 0 },
      side_of_component: "left",
      facing_direction: "left",
      distance_from_component_edge: 0.3,
      true_ccw_index: 0,
      pin_number: 1,
      is_connected: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_passive_other",
      schematic_component_id: "sch_passive",
      source_port_id: "passive_other",
      center: { x: pinDistance + 1.5, y: 0 },
      side_of_component: "right",
      facing_direction: "right",
      distance_from_component_edge: 0.3,
      true_ccw_index: 1,
      pin_number: 2,
      is_connected: false,
    },
    {
      type: "schematic_trace",
      schematic_trace_id: "sch_connection",
      source_trace_id: "connection",
      edges: [{ from: { x: 0, y: 0 }, to: { x: pinDistance, y: 0 } }],
      junctions: [],
    },
  ]
}

export function getLocalSpacingPort(json: CircuitJson, id: string): SourcePort {
  const port = json.find(
    (e) => e.type === "source_port" && e.source_port_id === id,
  )
  if (!port || port.type !== "source_port")
    throw new Error(`Missing source port ${id}`)
  return port
}

export function getLocalSpacingComponent(
  json: CircuitJson,
  id: string,
): SchematicComponent {
  const component = json.find(
    (e) => e.type === "schematic_component" && e.source_component_id === id,
  )
  if (!component || component.type !== "schematic_component")
    throw new Error(`Missing schematic component ${id}`)
  return component
}

export function inspectLocalPassiveSpacing(
  json: CircuitJson,
  testPath: string,
  variant?: string,
) {
  const before = JSON.stringify(json)
  const analysis = analyzeSchematicPlacement(json, {
    issueTypes: ["LocalPassiveConnectionTooLong"],
  })
  expect(JSON.stringify(json)).toBe(before)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson: json, analysis }),
  ).toMatchSvgSnapshot(testPath, variant)
  return analysis.getIssues({ issueTypes: ["LocalPassiveConnectionTooLong"] })
}
