import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createMouseInductorCapacitor } from "../assets/mouse-inductor-capacitor"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
const reports = (j: CircuitJson) =>
  analyzeSchematicPlacement(j, {
    issueTypes: ["InductorCapacitorNotGrouped"],
  }).getIssues()
test("inductor-capacitor-grouping uses typed topology and skips ambiguous geometry", async () => {
  const before = await createMouseInductorCapacitor(),
    after = await createMouseInductorCapacitor(true),
    saved = JSON.stringify(before)
  expect(reports(before)).toHaveLength(1)
  expect(reports(after)).toEqual([])
  expect(reports([])).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()
      .InductorCapacitorNotGrouped,
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<InductorCapacitorNotGrouped ",
  )
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "GND"
      e.port_hints = ["VCC"]
      e.pin_number = 99
    }
  }
  expect(reports(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(reports(j)).toEqual([])
  }
  for (const kind of [
    "sheet",
    "group",
    "size",
    "position",
    "duplicate",
    "dnp",
    "type",
  ] as const)
    reject((j) => {
      const b = box(j, "L_ANT_SERIES")
      if (kind === "sheet") b.schematic_sheet_id = "other"
      if (kind === "group") b.schematic_group_id = "other"
      if (kind === "size") b.size.width = NaN
      if (kind === "position") b.center.x = Infinity
      if (kind === "duplicate")
        j.push({ ...b, schematic_component_id: "duplicate" })
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
      if (kind === "type")
        Object.assign(
          j.find(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === b.source_component_id,
          )!,
          { ftype: "simple_chip" },
        )
    })
  for (const kind of [
    "dnc",
    "missing",
    "duplicate",
    "position",
    "facing",
  ] as const)
    reject((j) => {
      const p = port(j, "L_ANT_SERIES", "pin1")
      const g = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )!
      if (g.type !== "schematic_port") throw new Error("missing geometry")
      if (kind === "dnc") p.do_not_connect = true
      if (kind === "missing") j.splice(j.indexOf(g), 1)
      if (kind === "duplicate") j.push({ ...g, schematic_port_id: "duplicate" })
      if (kind === "position") g.center.y = NaN
      if (kind === "facing") delete g.facing_direction
    })
  for (const kind of [
    "dnc",
    "missing",
    "duplicate",
    "position",
    "facing",
  ] as const)
    reject((j) => {
      const p = port(j, "L_ANT_SERIES", "pin2")
      const g = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )!
      if (g.type !== "schematic_port") throw new Error("missing geometry")
      if (kind === "dnc") p.do_not_connect = true
      if (kind === "missing") j.splice(j.indexOf(g), 1)
      if (kind === "duplicate") j.push({ ...g, schematic_port_id: "duplicate" })
      if (kind === "position") g.center.y = NaN
      if (kind === "facing") delete g.facing_direction
    })
  for (const kind of [
    "sheet",
    "group",
    "size",
    "position",
    "duplicate",
    "dnp",
    "type",
  ] as const)
    reject((j) => {
      const b = box(j, "C_ANT_SHUNT")
      if (kind === "sheet") b.schematic_sheet_id = "other"
      if (kind === "group") b.schematic_group_id = "other"
      if (kind === "size") b.size.width = NaN
      if (kind === "position") b.center.x = Infinity
      if (kind === "duplicate")
        j.push({ ...b, schematic_component_id: "duplicate" })
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
      if (kind === "type")
        Object.assign(
          j.find(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === b.source_component_id,
          )!,
          { ftype: "simple_chip" },
        )
    })
  for (const kind of [
    "dnc",
    "missing",
    "duplicate",
    "position",
    "facing",
  ] as const)
    reject((j) => {
      const p = port(j, "C_ANT_SHUNT", "pin1")
      const g = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )!
      if (g.type !== "schematic_port") throw new Error("missing geometry")
      if (kind === "dnc") p.do_not_connect = true
      if (kind === "missing") j.splice(j.indexOf(g), 1)
      if (kind === "duplicate") j.push({ ...g, schematic_port_id: "duplicate" })
      if (kind === "position") g.center.y = NaN
      if (kind === "facing") delete g.facing_direction
    })
  for (const kind of [
    "dnc",
    "missing",
    "duplicate",
    "position",
    "facing",
  ] as const)
    reject((j) => {
      const p = port(j, "C_ANT_SHUNT", "pin2")
      const g = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )!
      if (g.type !== "schematic_port") throw new Error("missing geometry")
      if (kind === "dnc") p.do_not_connect = true
      if (kind === "missing") j.splice(j.indexOf(g), 1)
      if (kind === "duplicate") j.push({ ...g, schematic_port_id: "duplicate" })
      if (kind === "position") g.center.y = NaN
      if (kind === "facing") delete g.facing_direction
    })
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
  reject((j) => {
    for (const e of j) if (e.type === "source_net") delete e.is_ground
  })
  reject((j) => {
    const c = j.find(
      (e) => e.type === "source_component" && e.name === "C_ANT_SHUNT",
    )
    if (c?.type === "source_component" && c.ftype === "simple_capacitor")
      c.capacitance = 0
  })
  for (const pin of ["pin1", "pin2"])
    reject((j) => {
      port(j, "L_ANT_SERIES", pin).requires_power = true
    })
  reject((j) => {
    j.push({
      type: "source_trace",
      source_trace_id: "short",
      connected_source_port_ids: [
        port(j, "L_ANT_SERIES", "pin1").source_port_id,
        port(j, "L_ANT_SERIES", "pin2").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  // Real extra C branches on either end exclude ambiguous banks and C-L-C networks.
  for (const end of ["pin1", "pin2"])
    reject((j) => {
      const c = j.find(
        (e) => e.type === "source_component" && e.name === "C_ANT_SHUNT",
      )!
      if (c.type !== "source_component") throw new Error("missing cap")
      j.push({ ...c, source_component_id: "extra-cap" })
      const a = port(j, "C_ANT_SHUNT", "pin1"),
        b = port(j, "C_ANT_SHUNT", "pin2")
      j.push(
        { ...a, source_port_id: "extra-a", source_component_id: "extra-cap" },
        { ...b, source_port_id: "extra-b", source_component_id: "extra-cap" },
        {
          type: "source_trace",
          source_trace_id: "extra-a",
          connected_source_port_ids: [
            "extra-a",
            port(j, "L_ANT_SERIES", end).source_port_id,
          ],
          connected_source_net_ids: [],
        },
        {
          type: "source_trace",
          source_trace_id: "extra-b",
          connected_source_port_ids: ["extra-b", b.source_port_id],
          connected_source_net_ids: [],
        },
      )
    })
  // Same-side separation is not this reversal rule; a compact bend is also valid.
  const move = (j: CircuitJson, dx: number, dy: number) => {
    const b = box(j, "C_ANT_SHUNT")
    b.center.x += dx
    b.center.y += dy
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === b.schematic_component_id
      ) {
        e.center.x += dx
        e.center.y += dy
      }
  }
  reject((j) => move(j, 8, 0))
  reject((j) => move(j, 3, 1))
})
