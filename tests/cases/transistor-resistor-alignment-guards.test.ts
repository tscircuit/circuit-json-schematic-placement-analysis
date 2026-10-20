import { stm32MiniDevBoard } from "../assets/stm32-mini-dev-board"
import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createTrackerTransistorResistor } from "../assets/tracker-transistor-resistor"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"

test("transistor resistor alignment ignores semantic names and skips ambiguous topology or placement", async () => {
  const before = await createTrackerTransistorResistor(),
    after = await createTrackerTransistorResistor("after")
  const saved = JSON.stringify(before)
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["TransistorResistorNotAligned"],
    }).getIssues()
  // Load placement and resistor alignment are independent findings on the same pair.
  const alignment = issues(stm32MiniDevBoard)
  expect(alignment).toMatchObject([
    {
      lineItemType: "TransistorResistorNotAligned",
      transistorSchematicBox: { sourceComponentName: "Q1" },
      resistorSchematicBox: { sourceComponentName: "R6" },
    },
  ])
  const driver = analyzeSchematicPlacement(stm32MiniDevBoard)
  expect(
    driver.getIssues({ issueTypes: ["LowSideTransistorNotAlignedWithLoad"] }),
  ).toHaveLength(1)
  expect(
    driver.getIssues({ issueTypes: ["TransistorResistorNotAligned"] }),
  ).toEqual(alignment)
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()
      .TransistorResistorNotAligned,
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<TransistorResistorNotAligned ",
  )
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "VCC"
      e.port_hints = ["GND", "collector"]
      e.pin_number = 99
    }
    if (e.type === "source_net") e.name = "GND"
    if (e.type === "schematic_net_label") e.text = "GND"
  }
  expect(issues(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  for (const name of ["R12", "Q1"]) {
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
      const id = box(j, name).source_component_id
      Object.assign(
        j.find(
          (e) => e.type === "source_component" && e.source_component_id === id,
        )!,
        { ftype: "simple_chip" },
      )
    })
  }
  for (const [name, pin] of [
    ["R12", "pin1"],
    ["R12", "pin2"],
    ["Q1", "base"],
    ["Q1", "collector"],
    ["Q1", "emitter"],
  ]) {
    reject((j) => {
      port(j, name!, pin!).do_not_connect = true
    })
    reject((j) => {
      const id = port(j, name!, pin!).source_port_id
      j.splice(
        j.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    })
    reject((j) => {
      const id = port(j, name!, pin!).source_port_id
      for (const e of j)
        if (e.type === "schematic_port" && e.source_port_id === id)
          e.center.x = Infinity
    })
  }
  reject((j) => {
    port(j, "R12", "pin1").provides_power = true
  })
  reject((j) => {
    port(j, "R12", "pin2").requires_ground = true
  })
  reject((j) => {
    const p = port(j, "R12", "pin2")
    j.push({ ...p, source_port_id: "extra", source_component_id: "other" })
    j.push({
      type: "source_trace",
      source_trace_id: "branch",
      connected_source_port_ids: [p.source_port_id, "extra"],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    j.push({
      type: "source_trace",
      source_trace_id: "feedback",
      connected_source_port_ids: [
        port(j, "R12", "pin1").source_port_id,
        port(j, "Q1", "collector").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    const c = j.find((e) => e.type === "source_component" && e.name === "R12")!
    Object.assign(c, { resistance: 0 })
  })
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
  const moveR = (j: CircuitJson, dx: number, dy: number) => {
    const r = box(j, "R12")
    r.center.x += dx
    r.center.y += dy
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === r.schematic_component_id
      ) {
        e.center.x += dx
        e.center.y += dy
      }
  }
  // A short local bend is acceptable. A separated pair needs a straight, facing connection.
  const compact = structuredClone(after)
  moveR(compact, 0, 0.4)
  expect(issues(compact)).toEqual([])
  for (const [offset, count] of [
    [0, 0],
    [0.14, 0],
    [0.16, 1],
  ] as const) {
    const j = structuredClone(after)
    moveR(j, -4, offset)
    expect(issues(j)).toHaveLength(count)
  }
})
