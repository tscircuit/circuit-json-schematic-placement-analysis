import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
import { create555TimingNetwork } from "../assets/555-timing-network"
test("rrc-timing-network uses typed topology and tolerates compact alternative layouts", async () => {
  const before = await create555TimingNetwork(),
    after = await create555TimingNetwork(false, true)
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["RrcTimingNetworkNotGrouped"],
    }).getIssues()
  const saved = JSON.stringify(before)
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  const analysis = analyzeSchematicPlacement(before)
  expect(analysis.getIssueCounts().RrcTimingNetworkNotGrouped).toBe(1)
  expect(analysis.toString()).toContain("<RrcTimingNetworkNotGrouped ")
  expect(
    analysis.getIssues({
      issueTypes: ["RrcTimingNetworkNotGrouped"],
      schematicSheetId: "other",
    }),
  ).toEqual([])
  expect(
    analyzeSchematicPlacement(before, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") {
      e.name = "arbitrary"
      delete e.manufacturer_part_number
    }
    if (e.type === "source_port") {
      e.name = "VCC"
      e.port_hints = ["GND", "RESET"]
      e.pin_number = 99
    }
    if (e.type === "source_net") e.name = "GND"
    if (
      e.type === "source_port" ||
      e.type === "source_trace" ||
      e.type === "source_net"
    )
      delete e.subcircuit_connectivity_map_key
  }
  expect(issues(renamed)).toHaveLength(1)
  for (const source of [before, after])
    for (const turns of [0, 1, 2, 3])
      for (const reflect of [false, true]) {
        const j = structuredClone(source),
          directions = ["right", "up", "left", "down"] as const
        for (const e of j) {
          if (e.type !== "schematic_component" && e.type !== "schematic_port")
            continue
          for (let n = 0; n < turns; n++)
            e.center = { x: -e.center.y, y: e.center.x }
          if (reflect) e.center.x = -e.center.x
          e.center.x += 20
          e.center.y -= 15
          if (e.type === "schematic_component" && turns % 2)
            e.size = { width: e.size.height, height: e.size.width }
          if (e.type === "schematic_port" && e.facing_direction) {
            e.facing_direction =
              directions[(directions.indexOf(e.facing_direction) + turns) % 4]!
            if (
              reflect &&
              (e.facing_direction === "left" || e.facing_direction === "right")
            )
              e.facing_direction =
                e.facing_direction === "left" ? "right" : "left"
          }
        }
        expect(issues(j)).toHaveLength(source === before ? 1 : 0)
      }
  const reject = (name: string, edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j), name).toEqual([])
  }
  for (const name of ["R1", "R2", "C1", "U1"]) {
    reject("separate sheet " + name, (j) => {
      box(j, name).schematic_sheet_id = "other"
    })
    reject("separate block " + name, (j) => {
      box(j, name).schematic_group_id = "other"
    })
    reject("invalid size " + name, (j) => {
      box(j, name).size.width = NaN
    })
    reject("zero height " + name, (j) => {
      box(j, name).size.height = 0
    })
    reject("ambiguous placement " + name, (j) => {
      j.push({ ...box(j, name), schematic_component_id: "duplicate" })
    })
    reject("DNP " + name, (j) => {
      j.push(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: "optional",
          source_component_id: box(j, name).source_component_id,
          center: { x: 0, y: 0 },
          width: 1,
          height: 1,
          rotation: 0,
          layer: "top",
          do_not_place: true,
        }),
      )
    })
  }
  for (const [name, pin] of [
    ["R1", "pin1"],
    ["R1", "pin2"],
    ["R2", "pin1"],
    ["R2", "pin2"],
    ["C1", "pin1"],
    ["C1", "pin2"],
    ["U1", "pin2"],
    ["U1", "pin6"],
    ["U1", "pin7"],
  ] as const) {
    reject("unconnected " + name + "." + pin, (j) => {
      port(j, name, pin).do_not_connect = true
    })
    reject("missing pin geometry " + name + "." + pin, (j) => {
      const id = port(j, name, pin).source_port_id
      j.splice(
        j.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    })
    reject("invalid pin geometry " + name + "." + pin, (j) => {
      const id = port(j, name, pin).source_port_id
      for (const e of j)
        if (e.type === "schematic_port" && e.source_port_id === id)
          e.center.x = Infinity
    })
  }
  reject("unknown ground despite GND labels", (j) => {
    for (const e of j) {
      if (e.type === "source_net") e.is_ground = false
      if (e.type === "source_port") {
        delete e.requires_ground
        delete e.provides_ground
      }
    }
  })
  reject("unknown supply despite VCC labels", (j) => {
    for (const e of j) {
      if (e.type === "source_net") {
        e.is_power = false
        e.is_positive_voltage_source = false
      }
      if (e.type === "source_port") {
        delete e.requires_power
        delete e.provides_power
        delete e.requires_voltage
        delete e.provides_voltage
      }
    }
  })
  for (const [n, p] of [
    ["R1", "pin2"],
    ["R2", "pin2"],
  ] as const)
    reject("shared junction", (j) => {
      const q = port(j, n, p)
      j.push({ ...q, source_port_id: "extra", source_component_id: "another" })
    })
  reject("different host chips", (j) => {
    port(j, "U1", "pin2").source_component_id = "different-chip"
  })
  for (const name of ["R1", "R2", "C1"])
    reject("nonpositive value " + name, (j) => {
      for (const e of j)
        if (
          e.type === "source_component" &&
          e.source_component_id === box(j, name).source_component_id
        ) {
          if (e.ftype === "simple_resistor") e.resistance = 0
          if (e.ftype === "simple_capacitor") e.capacitance = 0
        }
    })
  const offset = structuredClone(after),
    r = box(offset, "R2")
  r.center.x += 0.7
  for (const e of offset)
    if (
      e.type === "schematic_port" &&
      e.schematic_component_id === r.schematic_component_id
    )
      e.center.x += 0.7
  expect(issues(offset)).toEqual([])
})
