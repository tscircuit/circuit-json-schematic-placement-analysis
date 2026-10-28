import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
import { createGameboyGroundedCapacitor } from "../assets/gameboy-grounded-capacitor"
test("grounded-chip-capacitor uses typed topology and tolerates compact alternative layouts", async () => {
  const before = await createGameboyGroundedCapacitor(),
    after = await createGameboyGroundedCapacitor(true)
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["CapacitorSeparatedFromChipPins"],
    }).getIssues()
  const saved = JSON.stringify(before)
  expect(issues(before)).toMatchObject([
    { chipSourcePortIds: [port(before, "U_SPK_AMP", "pin8").source_port_id] },
  ])
  expect(issues(after)).toEqual([])
  const reordered = [
    ...before.filter((e) => e.type !== "source_port"),
    ...before.filter((e) => e.type === "source_port").reverse(),
  ]
  expect(issues(reordered)).toEqual(issues(before))
  // Ground may be explicit on the capacitor port, without a typed source net.
  for (const attr of ["requires_ground", "provides_ground"] as const) {
    const json = structuredClone(before)
    for (const e of json) {
      if (e.type === "source_net") e.is_ground = false
      if (e.type === "source_port") {
        delete e.requires_ground
        delete e.provides_ground
      }
    }
    port(json, "C_AMP_VREF", "pin2")[attr] = true
    expect(issues(json)).toHaveLength(1)
  }
  const analysis = analyzeSchematicPlacement(before)
  expect(analysis.getIssueCounts().CapacitorSeparatedFromChipPins).toBe(1)
  expect(analysis.toString()).toContain("<CapacitorSeparatedFromChipPins ")
  expect(
    analysis.getIssues({
      issueTypes: ["CapacitorSeparatedFromChipPins"],
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
  for (const name of ["U_SPK_AMP", "C_AMP_VREF"]) {
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
    ["U_SPK_AMP", "pin8"],
    ["C_AMP_VREF", "pin1"],
    ["C_AMP_VREF", "pin2"],
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
  reject("conflicting rail metadata", (j) => {
    for (const e of j)
      if (e.type === "source_net" && e.is_ground) e.is_power = true
  })
  reject("shared signal net", (j) => {
    const p = port(j, "U_SPK_AMP", "pin8")
    j.push({ ...p, source_port_id: "extra", source_component_id: "another" })
  })
  for (const attr of [
    "requires_power",
    "provides_power",
    "requires_ground",
    "provides_ground",
    "requires_voltage",
    "provides_voltage",
  ] as const)
    reject("supply role " + attr, (j) => {
      Object.assign(port(j, "U_SPK_AMP", "pin8"), {
        [attr]: attr.endsWith("voltage") ? 3.3 : true,
      })
    })
  reject("zero capacitance", (j) => {
    for (const e of j)
      if (e.type === "source_component" && e.ftype === "simple_capacitor")
        e.capacitance = 0
  })
  reject("missing pin direction", (j) => {
    const p = port(j, "U_SPK_AMP", "pin8")
    for (const e of j)
      if (e.type === "schematic_port" && e.source_port_id === p.source_port_id)
        delete e.facing_direction
  })
  // A capacitor beside its pin remains valid with offsets or a longer wire on that side.
  for (const [x, y] of [
    [-4, 2],
    [-6, -2],
    [-5, 5],
    [-2, 0],
    [0, 1],
  ]) {
    const j = structuredClone(before),
      c = box(j, "C_AMP_VREF"),
      dx = x! - c.center.x,
      dy = y! - c.center.y
    c.center = { x: x!, y: y! }
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === c.schematic_component_id
      ) {
        e.center.x += dx
        e.center.y += dy
      }
    expect(issues(j)).toEqual([])
  }
})
