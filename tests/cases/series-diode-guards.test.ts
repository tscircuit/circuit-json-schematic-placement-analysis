import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPowerFaultSeriesDiodes } from "../assets/power-fault-series-diodes"
import {
  getReproSourcePort as port,
  getReproSchematicComponent as box,
} from "../fixtures/placement-repro-assertions"

test("series-diode uses topology and accepts valid layouts while skipping ambiguous evidence", async () => {
  const before = await createPowerFaultSeriesDiodes(),
    after = await createPowerFaultSeriesDiodes(true),
    saved = JSON.stringify(before)
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["SeriesDiodesNotAligned"],
    }).getIssues()
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()[
      "SeriesDiodesNotAligned"
    ],
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<SeriesDiodesNotAligned ",
  )
  expect(
    analyzeSchematicPlacement(before, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "unrelated"
    if (e.type === "source_port") {
      e.name = "GND"
      e.port_hints = ["VCC", "output"]
    }
    if (e.type === "schematic_net_label") e.text = "GND"
  }
  expect(issues(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  for (const name of ["D302", "D303"]) {
    reject((j) => {
      box(j, name).schematic_sheet_id = "different"
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
  }
  for (const n of ["D302", "D303"])
    reject((j) => {
      port(j, n, "pin1").do_not_connect = true
    })
  reject((j) => {
    port(j, "D302", "pin2").provides_voltage = 5
  })
  reject((j) => {
    const p = port(j, "D302", "pin2")
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
      source_trace_id: "parallel",
      connected_source_port_ids: [
        port(j, "D302", "pin1").source_port_id,
        port(j, "D303", "pin1").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    j.splice(0, j.length, ...j.filter((e) => e.type !== "schematic_trace"))
  })
  const ordinary = structuredClone(before)
  for (const e of ordinary)
    if (e.type === "schematic_component" && e.symbol_name)
      e.symbol_name = "diode_right"
  expect(issues(ordinary)).toHaveLength(1)
  // Both axes, reflections and translated sheets must give the same result.
  for (const source of [before, after])
    for (const turns of [0, 1, 2, 3])
      for (const reflect of [false, true]) {
        const j = structuredClone(source),
          directions = ["right", "up", "left", "down"] as const
        const transform = (p: { x: number; y: number }) => {
          let { x, y } = p
          for (let n = 0; n < turns; n++) [x, y] = [-y, x]
          return { x: (reflect ? -x : x) + 25, y: y - 10 }
        }
        for (const e of j) {
          if (e.type === "schematic_component" || e.type === "schematic_port") {
            e.center = transform(e.center)
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
              edge.from = transform(edge.from)
              edge.to = transform(edge.to)
            }
        }
        expect(issues(j)).toHaveLength(source === before ? 1 : 0)
      }
})
