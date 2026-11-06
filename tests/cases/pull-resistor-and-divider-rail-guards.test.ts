import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPullResistorsWrongSideCircuitJson } from "../assets/pull-resistors-wrong-side"
import { createVoltageDividerPlacement } from "../assets/voltage-divider-placement"
import { getReproSourcePort } from "../fixtures/placement-repro-assertions"

test("PullResistorPlacementSolver honors source_port rail flags and skips DNP / DNC parts", async () => {
  const base = await createPullResistorsWrongSideCircuitJson()
  const issueTypes = ["PullResistorOnWrongSide"] as const
  const getIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()

  // Clear source_net rail flags and set them on source_port instead.
  const portRailed = structuredClone(base)
  for (const e of portRailed) {
    if (e.type === "source_net") {
      e.is_power = false
      e.is_positive_voltage_source = false
      e.is_ground = false
      e.name = "RAIL_NODE"
    }
  }
  getReproSourcePort(portRailed, "R1", "pin1").requires_power = true
  getReproSourcePort(portRailed, "R2", "pin2").requires_ground = true
  expect(getIssues(portRailed)).toHaveLength(2)

  // Marking R1 as do_not_place skips R1 unless a populated variant exists.
  const r1 = portRailed.find(
    (e) => e.type === "source_component" && e.name === "R1",
  )
  if (!r1 || r1.type !== "source_component") throw new Error("Missing R1")
  const withDnp = structuredClone(portRailed)
  withDnp.push({
    type: "pcb_component",
    pcb_component_id: "dnp_r1",
    source_component_id: r1.source_component_id,
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    do_not_place: true,
    obstructs_within_bounds: true,
  })
  expect(getIssues(withDnp)).toHaveLength(1)

  withDnp.push({
    type: "pcb_component",
    pcb_component_id: "populated_r1",
    source_component_id: r1.source_component_id,
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    do_not_place: false,
    obstructs_within_bounds: true,
  })
  expect(getIssues(withDnp)).toHaveLength(2)
})

test("SwitchPullResistorPlacementSolver honors source_port rail flags and skips DNP resistors", () => {
  const issueTypes = ["PullResistorOnWrongSide"] as const
  const getIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()

  const base: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "sw1",
      name: "SW1",
      ftype: "simple_switch",
    },
    {
      type: "source_component",
      source_component_id: "r1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 10000,
    },
    {
      type: "source_net",
      source_net_id: "net_vcc",
      name: "RAIL_SUP",
      is_ground: false,
      is_power: false,
      is_digital_signal: false,
      is_positive_voltage_source: false,
      member_source_group_ids: [],
    },
    {
      type: "source_net",
      source_net_id: "net_gnd",
      name: "RAIL_RET",
      is_ground: false,
      is_power: false,
      is_digital_signal: false,
      is_positive_voltage_source: false,
      member_source_group_ids: [],
    },
    {
      type: "source_net",
      source_net_id: "net_sig",
      name: "SIG",
      is_ground: false,
      is_power: false,
      is_digital_signal: false,
      is_positive_voltage_source: false,
      member_source_group_ids: [],
    },
    {
      type: "source_port",
      source_port_id: "sw1_p1",
      source_component_id: "sw1",
      name: "pin1",
      requires_ground: true,
    },
    {
      type: "source_port",
      source_port_id: "sw1_p2",
      source_component_id: "sw1",
      name: "pin2",
    },
    {
      type: "source_port",
      source_port_id: "r1_p1",
      source_component_id: "r1",
      name: "pin1",
      requires_power: true,
    },
    {
      type: "source_port",
      source_port_id: "r1_p2",
      source_component_id: "r1",
      name: "pin2",
    },
    {
      type: "source_trace",
      source_trace_id: "t_gnd",
      connected_source_net_ids: ["net_gnd"],
      connected_source_port_ids: ["sw1_p1"],
    },
    {
      type: "source_trace",
      source_trace_id: "t_sig",
      connected_source_net_ids: ["net_sig"],
      connected_source_port_ids: ["sw1_p2", "r1_p2"],
    },
    {
      type: "source_trace",
      source_trace_id: "t_vcc",
      connected_source_net_ids: ["net_vcc"],
      connected_source_port_ids: ["r1_p1"],
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_sw1",
      source_component_id: "sw1",
      center: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_r1",
      source_component_id: "r1",
      center: { x: 0, y: -4 },
      size: { width: 1, height: 1 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_sw1_p1",
      schematic_component_id: "sch_sw1",
      source_port_id: "sw1_p1",
      center: { x: 0, y: -0.5 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_sw1_p2",
      schematic_component_id: "sch_sw1",
      source_port_id: "sw1_p2",
      center: { x: 0, y: 0.5 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_r1_p1",
      schematic_component_id: "sch_r1",
      source_port_id: "r1_p1",
      center: { x: 0, y: -4.5 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_r1_p2",
      schematic_component_id: "sch_r1",
      source_port_id: "r1_p2",
      center: { x: 0, y: -3.5 },
    },
  ]

  expect(getIssues(base)).toHaveLength(1)

  const withDnp = structuredClone(base)
  withDnp.push({
    type: "pcb_component",
    pcb_component_id: "dnp_r1",
    source_component_id: "r1",
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    do_not_place: true,
    obstructs_within_bounds: true,
  })
  expect(getIssues(withDnp)).toEqual([])
})

test("VoltageDividerPlacementSolver honors source_port rail flags and DNP guards", async () => {
  const base = await createVoltageDividerPlacement()
  const issueTypes = [
    "VoltageDividerSupplyResistorBelowGroundResistor",
  ] as const
  const getIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()

  const portRailed = structuredClone(base)
  for (const e of portRailed) {
    if (e.type === "source_net") {
      e.is_power = false
      e.is_positive_voltage_source = false
      e.is_ground = false
      e.name = "NET_NODE"
    }
  }
  getReproSourcePort(portRailed, "RTOP", "pin1").requires_power = true
  getReproSourcePort(portRailed, "RBOT", "pin2").requires_ground = true
  expect(getIssues(portRailed)).toHaveLength(1)

  const rtop = portRailed.find(
    (e) => e.type === "source_component" && e.name === "RTOP",
  )
  if (!rtop || rtop.type !== "source_component") throw new Error("Missing RTOP")
  const withDnp = structuredClone(portRailed)
  withDnp.push({
    type: "pcb_component",
    pcb_component_id: "dnp_rtop",
    source_component_id: rtop.source_component_id,
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    do_not_place: true,
    obstructs_within_bounds: true,
  })
  expect(getIssues(withDnp)).toEqual([])
})
