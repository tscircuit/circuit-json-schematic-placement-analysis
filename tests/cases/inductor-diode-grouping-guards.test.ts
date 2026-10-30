import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createFieldkitInductorDiode } from "../assets/fieldkit-inductor-diode"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"

const reports = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, {
    issueTypes: ["InductorDiodeNotGrouped"],
  }).getIssues()

test("inductor diode grouping requires a private typed junction and a substantial backward branch", async () => {
  const before = await createFieldkitInductorDiode("before"),
    after = await createFieldkitInductorDiode("after"),
    saved = JSON.stringify(before)
  expect(reports(before)).toHaveLength(1)
  expect(reports(after)).toEqual([])
  expect(reports([])).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts().InductorDiodeNotGrouped,
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    '<InductorDiodeNotGrouped hostComponentName="U10"',
  )
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "GND"
      e.port_hints = ["VIN"]
      e.pin_number = 99
    }
  }
  expect(reports(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(reports(j)).toEqual([])
  }
  for (const name of ["U10", "L2", "D3"])
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
        if (kind === "type") Object.assign(c, { ftype: "simple_resistor" })
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
    ["U10", "SW"],
    ["L2", "pin1"],
    ["L2", "pin2"],
    ["D3", "anode"],
    ["D3", "cathode"],
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
  // Supply roles may be explicitly declared on ports instead of nets.
  const portSupplies = structuredClone(before)
  for (const e of portSupplies)
    if (e.type === "source_net") {
      delete e.is_power
      delete e.is_positive_voltage_source
    }
  port(portSupplies, "D3", "cathode").provides_power = true
  expect(reports(portSupplies)).toHaveLength(1)
  reject((j) => {
    port(j, "U10", "SW").requires_power = true
  })
  reject((j) => {
    port(j, "D3", "cathode").requires_ground = true
  })
  const join = (j: CircuitJson, a: [string, string], b: [string, string]) =>
    j.push({
      type: "source_trace",
      source_trace_id: "extra",
      connected_source_port_ids: [
        port(j, ...a).source_port_id,
        port(j, ...b).source_port_id,
      ],
      connected_source_net_ids: [],
    })
  // Extra chip pins at the junction, common outer rails and shorted devices are ambiguous.
  reject((j) => join(j, ["U10", "SW"], ["U10", "FB"]))
  reject((j) => join(j, ["L2", "pin1"], ["D3", "cathode"]))
  reject((j) => join(j, ["D3", "anode"], ["D3", "cathode"]))
  for (const [name, pin] of [
    ["L2", "pin1"],
    ["D3", "cathode"],
  ] as const)
    reject((j) => {
      const p = port(j, name, pin)
      j.push({ ...p, source_port_id: "third-pin" })
    })
  const move = (j: CircuitJson, name: string, dx: number, dy: number) => {
    const b = box(j, name)
    b.center.x += dx
    b.center.y += dy
    for (const p of j)
      if (
        p.type === "schematic_port" &&
        p.schematic_component_id === b.schematic_component_id
      ) {
        p.center.x += dx
        p.center.y += dy
      }
  }
  // Do not flag a compact bend, or a diode whose connected end faces one of its peers.
  reject((j) => move(j, "D3", 1.5, 1.8))
  reject((j) => move(j, "D3", 0, 5))
  reject((j) => move(j, "L2", 0, -6))
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
