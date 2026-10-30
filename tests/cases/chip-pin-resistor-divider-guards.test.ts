import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createBoostConverterDivider } from "../assets/boost-converter-divider"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
const reports = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, {
    issueTypes: ["ResistorDividerSeparatedFromChip"],
  }).getIssues()

test("divider detection respects topology, component identity, scope and pin geometry", async () => {
  const before = await createBoostConverterDivider("before"),
    after = await createBoostConverterDivider("after")
  const saved = JSON.stringify(before)
  expect(reports(before)).toHaveLength(1)
  expect(reports(after)).toEqual([])
  expect(reports([])).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()
      .ResistorDividerSeparatedFromChip,
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    '<ResistorDividerSeparatedFromChip hostComponentName="U1"',
  )
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "VCC"
      e.port_hints = ["GND"]
      e.pin_number = 99
    }
  }
  expect(reports(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(reports(j)).toEqual([])
  }
  for (const name of ["U1", "R1", "R2"])
    for (const kind of [
      "sheet",
      "group",
      "source-group",
      "size",
      "position",
      "duplicate",
      "dnp",
      "type",
    ] as const)
      reject((j) => {
        const b = box(j, name),
          c = j.find(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === b.source_component_id,
          )!
        if (kind === "sheet") b.schematic_sheet_id = "other"
        if (kind === "group") b.schematic_group_id = "other"
        if (kind === "source-group" && c.type === "source_component")
          c.source_group_id = "other"
        if (kind === "size") b.size.width = NaN
        if (kind === "position") b.center.y = Infinity
        if (kind === "duplicate")
          j.push({ ...b, schematic_component_id: "duplicate" })
        if (kind === "type") Object.assign(c, { ftype: "simple_capacitor" })
        if (kind === "dnp")
          j.push(
            pcb_component.parse({
              type: "pcb_component",
              pcb_component_id: "dnp",
              source_component_id: b.source_component_id,
              center: { x: 0, y: 0 },
              width: 1,
              height: 1,
              rotation: 0,
              layer: "top",
              do_not_place: true,
            }),
          )
      })
  for (const [name, pin] of [
    ["U1", "FB"],
    ["R1", "pin1"],
    ["R1", "pin2"],
    ["R2", "pin1"],
    ["R2", "pin2"],
  ])
    for (const kind of [
      "dnc",
      "missing",
      "duplicate",
      "position",
      "facing",
      "sheet",
    ] as const)
      reject((j) => {
        const p = port(j, name!, pin!),
          g = j.find(
            (e) =>
              e.type === "schematic_port" &&
              e.source_port_id === p.source_port_id,
          )!
        if (g.type !== "schematic_port") throw new Error("Missing geometry")
        if (kind === "dnc") p.do_not_connect = true
        if (kind === "missing") j.splice(j.indexOf(g), 1)
        if (kind === "duplicate")
          j.push({ ...g, schematic_port_id: "duplicate" })
        if (kind === "position") g.center.x = NaN
        if (kind === "facing") delete g.facing_direction
        if (kind === "sheet") g.schematic_sheet_id = "other"
      })
  reject((j) => {
    for (const e of j) {
      if (e.type === "source_net") {
        delete e.is_power
        delete e.is_ground
        delete e.is_positive_voltage_source
      }
      if (e.type === "source_port") {
        delete e.requires_power
        delete e.provides_power
        delete e.requires_ground
        delete e.provides_ground
        delete e.requires_voltage
        delete e.provides_voltage
      }
    }
  })
  // An explicitly rail-connected tap, invalid resistor value, or a branch to another device is not a private divider tap.
  reject((j) => {
    port(j, "U1", "FB").requires_power = true
  })
  reject((j) => {
    const c = j.find((e) => e.type === "source_component" && e.name === "R1")!
    if (c.type === "source_component" && c.ftype === "simple_resistor")
      c.resistance = 0
  })
  reject((j) => {
    j.push({
      type: "source_trace",
      source_trace_id: "extra",
      connected_source_port_ids: [
        port(j, "U1", "FB").source_port_id,
        port(j, "U1", "SW").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    j.push({
      type: "source_trace",
      source_trace_id: "short",
      connected_source_port_ids: [
        port(j, "R1", "pin1").source_port_id,
        port(j, "R1", "pin2").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    port(j, "R2", "pin2").requires_power = true
  })
  // Both bodies must lie beyond the opposite edge; same-side layouts, split dividers and modest offsets are valid.
  const move = (j: CircuitJson, name: string, dx: number) => {
    const b = box(j, name)
    b.center.x += dx
    for (const p of j)
      if (
        p.type === "schematic_port" &&
        p.schematic_component_id === b.schematic_component_id
      )
        p.center.x += dx
  }
  reject((j) => {
    move(j, "R1", -8)
    move(j, "R2", -8)
  })
  reject((j) => move(j, "R1", -8))
  reject((j) => {
    move(j, "R1", -4)
    move(j, "R2", -4)
  })
  // Geometry transforms test all four pin directions without rendering invalid rotated-chip snapshots.
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
          e.center.y -= 10
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
        expect(reports(j)).toHaveLength(source === before ? 1 : 0)
      }
})
