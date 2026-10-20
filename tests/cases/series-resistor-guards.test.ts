import { createBldcPhaseVGroupingBoxCircuitJson } from "../assets/bldc-phase-v"
import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema34SeriesResistors } from "../assets/nema34-series-resistors"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
test("series-resistor uses typed connectivity and skips ambiguous or unavailable evidence", async () => {
  const before = await createNema34SeriesResistors(),
    after = await createNema34SeriesResistors(true)
  const saved = JSON.stringify(before)
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["SeriesResistorsNotAligned"],
    }).getIssues()
  expect(issues(await createBldcPhaseVGroupingBoxCircuitJson())).toEqual([])
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()[
      "SeriesResistorsNotAligned"
    ],
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<SeriesResistorsNotAligned ",
  )
  expect(
    analyzeSchematicPlacement(before, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "VCC"
      e.port_hints = ["GND", "output"]
    }
    if (e.type === "source_net") e.name = "GND"
    if (e.type === "schematic_net_label") e.text = "VCC"
  }
  expect(issues(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  for (const name of ["R31", "R32"]) {
    reject((j) => {
      box(j, name).schematic_sheet_id = "different"
    })
    reject((j) => {
      box(j, name).schematic_group_id = "different"
    })
    reject((j) => {
      box(j, name).size.width = NaN
    })
    reject((j) => {
      box(j, name).size.height = 0
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
      port(j, name, "pin1").do_not_connect = true
    })
    reject((j) => {
      const id = port(j, name, "pin1").source_port_id
      j.splice(
        j.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    })
    reject((j) => {
      const id = port(j, name, "pin1").source_port_id
      for (const e of j)
        if (e.type === "schematic_port" && e.source_port_id === id)
          e.center.x = Infinity
    })
    reject((j) => {
      const id = box(j, name).source_component_id,
        c = j.find(
          (e) => e.type === "source_component" && e.source_component_id === id,
        )!
      Object.assign(c, { ftype: "simple_chip" })
    })
  }
  reject((j) => {
    const n = j.find((e) => e.type === "source_net" && e.name === "VMON_MID")
    if (n?.type !== "source_net") throw new Error("missing net")
    n.is_power = true
  })
  reject((j) => {
    port(j, "R31", "pin2").provides_power = true
  })
  reject((j) => {
    const p = port(j, "R31", "pin2")
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
      source_trace_id: "bypass",
      connected_source_port_ids: [
        port(j, "R31", "pin1").source_port_id,
        port(j, "R32", "pin2").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    const c = j.find((e) => e.type === "source_component" && e.name === "R31")
    if (c?.type === "source_component" && c.ftype === "simple_resistor")
      c.resistance = 0
  })
  // Position, orientation and reflection of the entire network cannot change the verdict.
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
  reject((j) => {
    const id = port(j, "R31", "pin2").source_port_id
    for (const e of j)
      if (e.type === "schematic_port" && e.source_port_id === id)
        delete e.facing_direction
  })
  for (const [dx, expected] of [
    [0.14, 0],
    [0.16, 1],
  ] as const) {
    const j = structuredClone(after),
      part = box(j, "R31")
    part.center.x += dx
    part.center.y += 2
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === part.schematic_component_id
      ) {
        e.center.x += dx
        e.center.y += 2
      }
    expect(issues(j)).toHaveLength(expected)
  }
})
