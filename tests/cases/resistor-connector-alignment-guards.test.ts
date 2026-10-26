import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createProgrammerResistorConnector } from "../assets/programmer-resistor-connector"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"

test("resistor-connector-alignment uses topology and accepts both horizontal and vertical alignments", async () => {
  const before = await createProgrammerResistorConnector(),
    after = await createProgrammerResistorConnector(true)
  const saved = JSON.stringify(before)
  const resistorId = box(before, "R_UART_TX").source_component_id
  const all = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["ResistorConnectorNotAligned"],
    }).getIssues()
  const issues = (j: CircuitJson) =>
    all(j).filter(
      (i) =>
        i.lineItemType === "ResistorConnectorNotAligned" &&
        i.resistorSchematicBox.sourceComponentId === resistorId,
    )
  expect(all(before)).toHaveLength(2)
  expect(all(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()
      .ResistorConnectorNotAligned,
  ).toBe(2)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<ResistorConnectorNotAligned ",
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
  expect(all(renamed)).toHaveLength(2)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  for (const name of ["R_UART_TX", "J5"]) {
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
    ["R_UART_TX", "pin1"],
    ["R_UART_TX", "pin2"],
    ["J5", "pin1"],
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
    const p = port(j, "R_UART_TX", "pin2")
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
  for (const flag of [
    "requires_power",
    "provides_power",
    "requires_ground",
    "provides_ground",
  ] as const)
    reject((j) => {
      port(j, "R_UART_TX", "pin2")[flag] = true
    })
  reject((j) => {
    j.push(
      {
        type: "source_net",
        source_net_id: "same-net",
        member_source_group_ids: [],
        name: "arbitrary",
        is_power: true,
      },
      {
        type: "source_trace",
        source_trace_id: "rail",
        connected_source_port_ids: [
          port(j, "R_UART_TX", "pin2").source_port_id,
        ],
        connected_source_net_ids: ["same-net"],
      },
    )
  })
  reject((j) => {
    j.push({
      type: "source_trace",
      source_trace_id: "shorted",
      connected_source_port_ids: [
        port(j, "R_UART_TX", "pin1").source_port_id,
        port(j, "R_UART_TX", "pin2").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  // Pull-up/down resistors are outside the series-signal connection rule.
  reject((j) => {
    port(j, "R_UART_TX", "pin1").requires_ground = true
  })
  reject((j) => {
    port(j, "R_UART_TX", "pin1").provides_power = true
  })
  const header = structuredClone(before)
  Object.assign(
    header.find(
      (e) =>
        e.type === "source_component" &&
        e.source_component_id === box(header, "J5").source_component_id,
    )!,
    { ftype: "simple_pin_header" },
  )
  expect(all(header)).toHaveLength(2)
  // Move the peer together with all its drawn terminals.
  const move = (j: CircuitJson, dx: number, dy: number) => {
    const c = box(j, "J5")
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
  const compact = structuredClone(before)
  const a = box(compact, "R_UART_TX"),
    b = box(compact, "J5")
  move(compact, a.center.x - b.center.x + 0.5, a.center.y - b.center.y - 0.5)
  expect(issues(compact)).toEqual([])
  const overlapping = structuredClone(before)
  move(
    overlapping,
    box(overlapping, "R_UART_TX").center.x - box(overlapping, "J5").center.x,
    box(overlapping, "R_UART_TX").center.y - box(overlapping, "J5").center.y,
  )
  expect(issues(overlapping)).toEqual([])
  const longAligned = structuredClone(after)
  move(longAligned, -4, 0)
  expect(issues(longAligned)).toEqual([])
  for (const offset of [0.14, 0.16, 5]) {
    const j = structuredClone(longAligned)
    move(j, 0, offset)
    expect(issues(j)).toEqual([])
  }
  // Test all quarter turns and reflections on a LONG straight branch too, so
  // horizontal acceptance cannot pass merely because of the compact exemption.
  for (const source of [before, longAligned])
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
})
