import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createRp2040LogicPower } from "../assets/rp2040-shared-node-diodes"
import {
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("shared-node diode placement uses typed topology and rejects ambiguous branches", async () => {
  const before = await createRp2040LogicPower()
  const issues = (c: CircuitJson) =>
    analyzeSchematicPlacement(c, {
      issueTypes: ["SharedNodeDiodesInline"],
    }).getIssues()
  const baseline = issues(before)
  expect(baseline).toHaveLength(1)
  const unmodified = JSON.stringify(before)
  expect(
    analyzeSchematicPlacement(before).getIssues({
      issueTypes: ["SharedNodeDiodesInline"],
    }),
  ).toEqual(baseline)
  expect(JSON.stringify(before)).toBe(unmodified)
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") {
      e.name = "unrelated"
      delete e.supplier_part_numbers
      delete e.manufacturer_part_number
    }
    if (e.type === "source_port") {
      e.name = "unknown"
      e.port_hints = []
    }
    if (e.type === "source_net") e.name = "unrelated"
    if (e.type === "schematic_net_label") e.text = "unrelated"
  }
  expect(issues(renamed)).toHaveLength(1)
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
  const connect = (c: CircuitJson, first: string, second: string) =>
    c.push({
      type: "source_trace",
      source_trace_id: "extra",
      connected_source_port_ids: [first, second],
      connected_source_net_ids: [],
    })
  reject((c) => {
    for (const e of c)
      if (e.type === "source_net") {
        e.is_power = false
        e.is_positive_voltage_source = false
      } else if (e.type === "source_port") {
        e.requires_power = false
        e.provides_power = false
      }
  })
  reject((c) => {
    const p = getReproSourcePort(c, "D2", "cathode")
    p.requires_ground = true
  })
  reject((c) => {
    const p = getReproSourcePort(c, "D2", "anode")
    p.requires_ground = true
  })
  reject((c) =>
    connect(
      c,
      getReproSourcePort(c, "D2", "anode").source_port_id,
      getReproSourcePort(c, "D5", "anode").source_port_id,
    ),
  )
  reject((c) =>
    connect(
      c,
      getReproSourcePort(c, "D2", "cathode").source_port_id,
      getReproSourcePort(c, "D6", "anode").source_port_id,
    ),
  )
  reject((c) => {
    getReproSourcePort(c, "D5", "anode").do_not_connect = true
  })
  reject((c) => {
    c.push({
      ...getReproSchematicComponent(c, "D5"),
      schematic_component_id: "duplicate",
    })
  })
  reject((c) => {
    getReproSchematicComponent(c, "D5").size.width = NaN
  })
  reject((c) => {
    getReproSchematicComponent(c, "D5").schematic_sheet_id = "another-sheet"
  })
  reject((c) => {
    const p = getReproSourcePort(c, "D5", "cathode")
    const pin = c.find(
      (e) =>
        e.type === "schematic_port" && e.source_port_id === p.source_port_id,
    )
    if (pin?.type === "schematic_port") pin.facing_direction = "down"
  })
  reject((c) => {
    const p = getReproSourcePort(c, "D5", "cathode")
    const pin = c.find(
      (e) =>
        e.type === "schematic_port" && e.source_port_id === p.source_port_id,
    )
    if (pin?.type === "schematic_port") pin.center.y -= 30
  })
  reject((c) => {
    const p = getReproSourcePort(c, "D5", "cathode")
    c.push({
      type: "pcb_component",
      pcb_component_id: "unpopulated",
      source_component_id: p.source_component_id!,
      center: { x: 0, y: 0 },
      width: 1,
      height: 1,
      rotation: 0,
      layer: "top",
      do_not_place: true,
    })
  })
  expect(issues(await createRp2040LogicPower(true))).toEqual([])
})
