import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPhoneStandFuseConnector } from "../assets/phone-stand-fuse-connector"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
test("fuse-connector-alignment uses typed topology and skips ambiguous or compact layouts", async () => {
  const before = await createPhoneStandFuseConnector(),
    after = await createPhoneStandFuseConnector(true)
  const saved = JSON.stringify(before)
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["FuseConnectorNotAligned"],
    }).getIssues()
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts().FuseConnectorNotAligned,
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<FuseConnectorNotAligned ",
  )
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "GND"
      e.port_hints = ["VCC", "collector"]
      e.pin_number = 99
    }
    if (e.type === "source_net") e.name = "arbitrary"
    if (e.type === "schematic_net_label") e.text = "arbitrary"
  }
  expect(issues(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  for (const name of ["F_QI", "J_QI"]) {
    reject((j) => {
      box(j, name).schematic_sheet_id = "other"
    })
    reject((j) => {
      box(j, name).schematic_group_id = "other"
    })
    reject((j) => {
      box(j, name).size.width = NaN
    })
    reject((j) => {
      j.push({ ...box(j, name), schematic_component_id: "duplicate" })
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
    reject((j) => {
      Object.assign(
        j.find(
          (e) =>
            e.type === "source_component" &&
            e.source_component_id === box(j, name).source_component_id,
        )!,
        { ftype: "simple_chip" },
      )
    })
  }
  for (const [name, pin] of [
    ["F_QI", "pin1"],
    ["F_QI", "pin2"],
    ["J_QI", "pin1"],
    ["J_QI", "pin2"],
  ] as const) {
    reject((j) => {
      port(j, name, pin).do_not_connect = true
    })
    reject((j) => {
      const id = port(j, name, pin).source_port_id
      j.splice(
        j.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    })
    reject((j) => {
      const id = port(j, name, pin).source_port_id
      for (const e of j)
        if (e.type === "schematic_port" && e.source_port_id === id)
          e.center.x = Infinity
    })
  }
  reject((j) => {
    const p = port(j, "F_QI", "pin2")
    j.push(
      { ...p, source_port_id: "extra", source_component_id: "other" },
      {
        type: "source_trace",
        source_trace_id: "branch",
        connected_source_port_ids: [p.source_port_id, "extra"],
        connected_source_net_ids: [],
      },
    )
  })
  // Names alone cannot supply the missing rail evidence.
  reject((j) => {
    for (const e of j)
      if (e.type === "source_net") {
        delete e.is_ground
        delete e.is_power
        delete e.is_positive_voltage_source
      }
  })
  reject((j) => {
    port(j, "J_QI", "pin2").provides_power = true
  })
  reject((j) => {
    port(j, "F_QI", "pin1").requires_ground = true
  })
  reject((j) => {
    const p = port(j, "J_QI", "pin2")
    j.push({ ...p, source_port_id: "third-header-pin", pin_number: 3 })
  })
  // Explicit source-port rail flags are equivalent to declared source-net flags.
  const flags = structuredClone(before)
  for (const e of flags)
    if (e.type === "source_net") {
      delete e.is_ground
      delete e.is_power
      delete e.is_positive_voltage_source
    }
  port(flags, "J_QI", "pin2").requires_ground = true
  expect(issues(flags)).toHaveLength(1)
  // Rotation, translation and reflection do not change the geometry decision.
  for (const source of [before, after])
    for (const turns of [0, 1, 2, 3])
      for (const reflect of [false, true]) {
        const j = structuredClone(source),
          directions = ["right", "up", "left", "down"] as const
        for (const e of j) {
          if (e.type !== "schematic_port" && e.type !== "schematic_component")
            continue
          for (let n = 0; n < turns; n++)
            e.center = { x: -e.center.y, y: e.center.x }
          if (reflect) e.center.x = -e.center.x
          e.center.x += 25
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
        expect(issues(j)).toHaveLength(source === before ? 1 : 0)
      }
  const move = (j: CircuitJson, dx: number, dy: number) => {
    const c = box(j, "F_QI")
    c.center.x += dx
    c.center.y += dy
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === c.schematic_component_id
      ) {
        e.center.x += dx
        e.center.y += dy
      }
  }
  const compact = structuredClone(after)
  move(compact, 0, 0.4)
  expect(issues(compact)).toEqual([])
  for (const [offset, count] of [
    [0, 0],
    [0.14, 0],
    [0.16, 1],
  ] as const) {
    const j = structuredClone(after)
    move(j, -4, offset)
    expect(issues(j)).toHaveLength(count)
  }
})
