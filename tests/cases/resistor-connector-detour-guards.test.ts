import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createConnectorGroundResistor } from "../assets/connector-ground-resistor"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"

test("resistor detours require private visible wires and placement behind the connector regardless of net roles", async () => {
  const before = await createConnectorGroundResistor(),
    after = await createConnectorGroundResistor(true)
  const saved = JSON.stringify(before),
    type = "ResistorConnectorNotAligned" as const
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, { issueTypes: [type] }).getIssues()
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = "arbitrary"
    if (e.type === "source_net") e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "arbitrary"
      e.port_hints = []
    }
    if (e.type === "schematic_net_label") e.text = "arbitrary"
  }
  expect(issues(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  for (const name of ["R_CC2", "J_USB"]) {
    reject((j) => {
      box(j, name).schematic_group_id = "other"
    })
    reject((j) => {
      box(j, name).schematic_sheet_id = "other"
    })
    reject((j) => {
      j.push(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: "dnp",
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
  for (const [name, p] of [
    ["J_USB", "B5"],
    ["R_CC2", "pin1"],
    ["R_CC2", "pin2"],
  ] as const)
    reject((j) => {
      port(j, name, p).do_not_connect = true
    })
  // Neither terminal needs a known role. Ground, supply, signal and unknown
  // metadata must leave the same geometric detour finding unchanged.
  const relevant = (j: CircuitJson) =>
    issues(j).filter(
      (i) =>
        i.lineItemType === type &&
        i.resistorSchematicBox.sourceComponentId ===
          box(j, "R_CC2").source_component_id,
    )
  for (const input of [before, after]) {
    const untyped = structuredClone(input)
    for (const e of untyped) {
      if (e.type === "source_net") {
        delete e.is_ground
        delete e.is_power
        delete e.is_positive_voltage_source
        e.name = "arbitrary"
      }
      if (e.type === "source_port") {
        delete e.requires_ground
        delete e.provides_ground
        delete e.requires_power
        delete e.provides_power
        delete e.requires_voltage
        delete e.provides_voltage
      }
    }
    const check = (j: CircuitJson) => {
      if (input === before) expect(relevant(j)).toHaveLength(1)
      else expect(relevant(j)).toEqual([])
    }
    check(untyped)
    for (const terminal of ["pin1", "pin2"] as const) {
      for (const flag of [
        "requires_ground",
        "provides_ground",
        "requires_power",
        "provides_power",
      ] as const) {
        const j = structuredClone(untyped)
        port(j, "R_CC2", terminal)[flag] = true
        check(j)
      }
      for (const flag of [
        "is_ground",
        "is_power",
        "is_positive_voltage_source",
      ] as const) {
        const j = structuredClone(untyped)
        j.push(
          {
            type: "source_net",
            source_net_id: "role",
            member_source_group_ids: [],
            name: "arbitrary",
            [flag]: true,
          },
          {
            type: "source_trace",
            source_trace_id: "role",
            connected_source_port_ids: [
              port(j, "R_CC2", terminal).source_port_id,
            ],
            connected_source_net_ids: ["role"],
          },
        )
        check(j)
      }
    }
  }
  // A zero-ohm resistor has the same drawing geometry and can have the same detour.
  const jumper = structuredClone(before)
  for (const e of jumper)
    if (e.type === "source_component" && e.ftype === "simple_resistor")
      e.resistance = 0
  expect(relevant(jumper)).toHaveLength(1)
  reject((j) => {
    const p = port(j, "R_CC2", "pin1")
    j.push(
      { ...p, source_component_id: "extra", source_port_id: "extra" },
      {
        type: "source_trace",
        source_trace_id: "extra",
        connected_source_port_ids: [p.source_port_id, "extra"],
        connected_source_net_ids: [],
      },
    )
  })
  reject((j) => {
    for (let k = j.length - 1; k >= 0; k--)
      if (j[k]!.type === "schematic_trace") j.splice(k, 1)
  })
  reject((j) => {
    j.push({
      type: "schematic_line",
      schematic_line_id: "divider",
      color: "#888",
      x1: 0,
      y1: -10,
      x2: 0,
      y2: 10,
      is_dashed: true,
    })
  })
  // Rotate/reflect the entire circuit, including drawn wires. Detection is not horizontal-only.
  for (const input of [before, after])
    for (const turns of [0, 1, 2, 3])
      for (const reflect of [false, true]) {
        const j = structuredClone(input),
          directions = ["right", "up", "left", "down"] as const
        const point = (p: { x: number; y: number }) => {
          let { x, y } = p
          for (let n = 0; n < turns; n++) [x, y] = [-y, x]
          return { x: (reflect ? -x : x) + 20, y: y - 10 }
        }
        for (const e of j) {
          if (e.type === "schematic_component" || e.type === "schematic_port") {
            e.center = point(e.center)
            if (e.type === "schematic_component" && turns % 2)
              e.size = { width: e.size.height, height: e.size.width }
            if (e.type === "schematic_port" && e.facing_direction) {
              e.facing_direction =
                directions[
                  (directions.indexOf(e.facing_direction) + turns) % 4
                ]!
              if (
                reflect &&
                (e.facing_direction === "left" ||
                  e.facing_direction === "right")
              )
                e.facing_direction =
                  e.facing_direction === "left" ? "right" : "left"
            }
          }
          if (e.type === "schematic_trace")
            for (const edge of e.edges) {
              edge.from = point(edge.from)
              edge.to = point(edge.to)
            }
        }
        expect(issues(j)).toHaveLength(input === before ? 1 : 0)
      }
})
