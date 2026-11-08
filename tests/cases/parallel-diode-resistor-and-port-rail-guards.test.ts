import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPiFilterPlacement } from "../assets/pi-filter-placement"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { getReproSourcePort } from "../fixtures/placement-repro-assertions"

test("ParallelDiodeResistorPlacementSolver guards unplaced bank members, DNP parts, invalid resistance, and power-to-ground pairs", () => {
  const base = getRp2040BldcSheet("power_input")
  const issueTypes = ["ParallelDiodeResistorNotAligned"] as const
  const getIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()

  expect(getIssues(base)).toMatchObject([
    {
      diodeSchematicBox: { sourceComponentName: "D_PD_SENSE" },
      resistorSchematicBox: { sourceComponentName: "R_PD_SENSE_CHARGE" },
      reason: "crossed_connections",
    },
  ])

  const resistor = base.find(
    (e) =>
      e.type === "source_component" &&
      e.ftype === "simple_resistor" &&
      e.name === "R_PD_SENSE_CHARGE",
  )
  const diode = base.find(
    (e) => e.type === "source_component" && e.name === "D_PD_SENSE",
  )
  if (
    !resistor ||
    resistor.type !== "source_component" ||
    resistor.ftype !== "simple_resistor" ||
    !diode ||
    diode.type !== "source_component"
  ) {
    throw new Error("Missing D_PD_SENSE / R_PD_SENSE_CHARGE fixture components")
  }

  // 1. An unplaced 3rd parallel member on the same nets makes the bank ambiguous.
  const withUnplacedThird = structuredClone(base)
  withUnplacedThird.push({
    ...resistor,
    source_component_id: "extra_unplaced_resistor",
    name: "R_EXTRA_UNPLACED",
  })
  const resistorPorts = base.filter(
    (e) =>
      e.type === "source_port" &&
      e.source_component_id === resistor.source_component_id,
  )
  for (const [idx, port] of resistorPorts.entries()) {
    if (port.type !== "source_port") continue
    const newPortId = `extra_unplaced_port_${idx}`
    withUnplacedThird.push({
      ...port,
      source_component_id: "extra_unplaced_resistor",
      source_port_id: newPortId,
    })
    const trace = withUnplacedThird.find(
      (e) =>
        e.type === "source_trace" &&
        e.connected_source_port_ids.includes(port.source_port_id),
    )
    if (trace?.type === "source_trace") {
      trace.connected_source_port_ids.push(newPortId)
    }
  }
  expect(getIssues(withUnplacedThird)).toEqual([])

  // 2. A do_not_place PCB record skips the pair unless a populated variant exists.
  const withDnp = structuredClone(base)
  withDnp.push({
    type: "pcb_component",
    pcb_component_id: "dnp_resistor",
    source_component_id: resistor.source_component_id,
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    do_not_place: true,
    obstructs_within_bounds: true,
  })
  expect(getIssues(withDnp)).toEqual([])
  withDnp.push({
    type: "pcb_component",
    pcb_component_id: "populated_resistor",
    source_component_id: resistor.source_component_id,
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    do_not_place: false,
    obstructs_within_bounds: true,
  })
  expect(getIssues(withDnp)).toHaveLength(1)

  // 3. Zero or non-finite resistance skips the resistor.
  const withZeroResistance = structuredClone(base)
  for (const e of withZeroResistance) {
    if (
      e.type === "source_component" &&
      e.source_component_id === resistor.source_component_id &&
      e.ftype === "simple_resistor"
    ) {
      e.resistance = 0
    }
  }
  expect(getIssues(withZeroResistance)).toEqual([])

  // 4. Pairs connected across power and ground rails (including port rail flags) are skipped.
  const withPortRails = structuredClone(base)
  const [p1, p2] = resistorPorts
  if (p1?.type === "source_port" && p2?.type === "source_port") {
    for (const e of withPortRails) {
      if (e.type === "source_port" && e.source_port_id === p1.source_port_id) {
        e.requires_power = true
      }
      if (e.type === "source_port" && e.source_port_id === p2.source_port_id) {
        e.requires_ground = true
      }
    }
  }
  expect(getIssues(withPortRails)).toEqual([])
})

test("PiFilterPlacementSolver recognizes ground and power rail roles from source_port flags and validates inductance", async () => {
  const issueTypes = ["PiFilterComponentsNotGrouped"] as const
  const getIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()

  const portGrounded = await createPiFilterPlacement()
  for (const e of portGrounded) {
    if (e.type === "source_net") {
      e.is_ground = false
      e.name = "RETURN_NODE"
    }
  }
  getReproSourcePort(portGrounded, "C1", "pin2").requires_ground = true
  expect(getIssues(portGrounded)).toHaveLength(1)

  // Marking the series net as power via source_port skips the signal pi-filter check.
  const portPowered = structuredClone(portGrounded)
  getReproSourcePort(portPowered, "L1", "pin1").provides_power = true
  expect(getIssues(portPowered)).toEqual([])

  // Zero inductance is skipped.
  const zeroInductance = await createPiFilterPlacement()
  for (const e of zeroInductance) {
    if (e.type === "source_component" && e.ftype === "simple_inductor") {
      e.inductance = 0
    }
  }
  expect(getIssues(zeroInductance)).toEqual([])
})

test("SwitchRcNetworkGroupingSolver recognizes port rail flags and validates parallel capacitor capacitance", () => {
  const issueTypes = ["SwitchRcNetworkNotGrouped"] as const
  const getIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()

  const base: CircuitJson = [
    {
      type: "source_component",
      source_component_id: "sw1",
      name: "SW1",
      ftype: "simple_push_button",
    },
    {
      type: "source_component",
      source_component_id: "c1",
      name: "C1",
      ftype: "simple_capacitor",
      capacitance: 1e-7,
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
      source_net_id: "net_ret",
      name: "RET",
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
      type: "source_net",
      source_net_id: "net_sup",
      name: "SUP",
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
      source_port_id: "c1_p1",
      source_component_id: "c1",
      name: "pin1",
    },
    {
      type: "source_port",
      source_port_id: "c1_p2",
      source_component_id: "c1",
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
      source_trace_id: "t_ret",
      connected_source_net_ids: ["net_ret"],
      connected_source_port_ids: ["sw1_p1", "c1_p1"],
    },
    {
      type: "source_trace",
      source_trace_id: "t_sig",
      connected_source_net_ids: ["net_sig"],
      connected_source_port_ids: ["sw1_p2", "c1_p2", "r1_p2"],
    },
    {
      type: "source_trace",
      source_trace_id: "t_sup",
      connected_source_net_ids: ["net_sup"],
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
      schematic_component_id: "sch_c1",
      source_component_id: "c1",
      center: { x: 10, y: 0 },
      size: { width: 1, height: 1 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_r1",
      source_component_id: "r1",
      center: { x: 2, y: 0 },
      size: { width: 1, height: 1 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_sw1_p1",
      schematic_component_id: "sch_sw1",
      source_port_id: "sw1_p1",
      center: { x: -0.5, y: 0 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_sw1_p2",
      schematic_component_id: "sch_sw1",
      source_port_id: "sw1_p2",
      center: { x: 0.5, y: 0 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_c1_p1",
      schematic_component_id: "sch_c1",
      source_port_id: "c1_p1",
      center: { x: 9.5, y: 0 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_c1_p2",
      schematic_component_id: "sch_c1",
      source_port_id: "c1_p2",
      center: { x: 10.5, y: 0 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_r1_p1",
      schematic_component_id: "sch_r1",
      source_port_id: "r1_p1",
      center: { x: 1.5, y: 0 },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp_r1_p2",
      schematic_component_id: "sch_r1",
      source_port_id: "r1_p2",
      center: { x: 2.5, y: 0 },
    },
  ]

  expect(getIssues(base)).toHaveLength(1)

  const zeroCap = structuredClone(base)
  for (const e of zeroCap) {
    if (e.type === "source_component" && e.ftype === "simple_capacitor") {
      e.capacitance = 0
    }
  }
  expect(getIssues(zeroCap)).toEqual([])
})
