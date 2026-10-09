import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createStridePedometer } from "../assets/stride-chip-supply-inductor"
import {
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("chip supply inductor placement requires typed connectivity and unambiguous local geometry", async () => {
  const before = await createStridePedometer()
  const issues = (cj: CircuitJson) =>
    analyzeSchematicPlacement(cj, {
      issueTypes: ["InductorSeparatedFromChipPin"],
    }).getIssues()
  const original = JSON.stringify(before)
  const baseline = issues(before)
  expect(baseline).toHaveLength(1)
  expect(
    analyzeSchematicPlacement(before).getIssues({
      issueTypes: ["InductorSeparatedFromChipPin"],
    }),
  ).toEqual(baseline)
  expect(JSON.stringify(before)).toBe(original)
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") {
      e.name = "unrelated"
      delete e.manufacturer_part_number
      delete e.supplier_part_numbers
    }
    if (e.type === "source_port") {
      e.name = "unknown"
      e.port_hints = []
    }
    if (e.type === "source_net") e.name = "unrelated"
    if (e.type === "schematic_net_label") e.text = "unrelated"
  }
  expect(issues(renamed)).toHaveLength(1)
  const portFlag = structuredClone(before)
  for (const e of portFlag)
    if (e.type === "source_net") {
      e.is_power = false
      e.is_positive_voltage_source = false
    }
  getReproSourcePort(portFlag, "L1", "pin2").requires_power = true
  expect(issues(portFlag)).toHaveLength(1)
  for (const turns of [1, 2, 3]) {
    const c = structuredClone(before)
    const directions = ["right", "up", "left", "down"] as const
    for (const e of c) {
      if (e.type !== "schematic_component" && e.type !== "schematic_port")
        continue
      for (let i = 0; i < turns; i++) {
        const { x, y } = e.center
        e.center = { x: -y, y: x }
      }
      e.center.x += 50
      e.center.y -= 30
      if (e.type === "schematic_component" && turns % 2)
        e.size = { width: e.size.height, height: e.size.width }
      if (e.type === "schematic_port" && e.facing_direction)
        e.facing_direction =
          directions[(directions.indexOf(e.facing_direction) + turns) % 4]!
    }
    expect(issues(c)).toHaveLength(1)
  }
  const reject = (edit: (c: CircuitJson) => void) => {
    const c = structuredClone(before)
    edit(c)
    expect(issues(c)).toEqual([])
  }
  reject((c) => {
    for (const e of c) {
      if (e.type === "source_net") {
        e.is_power = false
        e.is_positive_voltage_source = false
      }
      if (e.type === "source_port") {
        e.requires_power = false
        e.provides_power = false
      }
    }
  })
  reject((c) => {
    getReproSourcePort(c, "L1", "pin1").requires_power = true
  })
  reject((c) => {
    getReproSourcePort(c, "L1", "pin2").requires_ground = true
  })
  reject((c) => {
    getReproSourcePort(c, "L1", "pin1").do_not_connect = true
  })
  reject((c) => {
    getReproSourcePort(c, "U1", "DCDC").do_not_connect = true
  })
  reject((c) => {
    getReproSourcePort(c, "U1", "VDDR1").do_not_connect = true
  })
  reject((c) => {
    const ids = new Set(
      ["VDDR1", "VDDR2"].map(
        (pin) => getReproSourcePort(c, "U1", pin).source_port_id,
      ),
    )
    for (const e of c)
      if (e.type === "source_port" && ids.has(e.source_port_id))
        delete e.subcircuit_connectivity_map_key
      else if (e.type === "source_trace")
        e.connected_source_port_ids = e.connected_source_port_ids.filter(
          (id) => !ids.has(id),
        )
  })
  reject((c) => {
    c.push({
      type: "source_trace",
      source_trace_id: "extra-branch",
      connected_source_port_ids: [
        getReproSourcePort(c, "L1", "pin1").source_port_id,
        getReproSourcePort(c, "C21", "pin1").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  reject((c) => {
    getReproSchematicComponent(c, "L1").schematic_sheet_id = "another-sheet"
  })
  reject((c) => {
    getReproSchematicComponent(c, "L1").schematic_group_id = "another-group"
  })
  reject((c) => {
    getReproSchematicComponent(c, "L1").size.width = NaN
  })
  reject((c) => {
    c.push({
      ...getReproSchematicComponent(c, "L1"),
      schematic_component_id: "duplicate",
    })
  })
  reject((c) => {
    const p = getReproSourcePort(c, "L1", "pin1")
    for (const e of c)
      if (e.type === "schematic_port" && e.source_port_id === p.source_port_id)
        e.center.x = Infinity
  })
  reject((c) => {
    c.push(
      pcb_component.parse({
        type: "pcb_component",
        pcb_component_id: "unpopulated",
        source_component_id: getReproSourcePort(c, "L1", "pin1")
          .source_component_id,
        center: { x: 0, y: 0 },
        width: 1,
        height: 1,
        rotation: 0,
        layer: "top",
        do_not_place: true,
      }),
    )
  })
  expect(issues(await createStridePedometer(true))).toEqual([])
})
