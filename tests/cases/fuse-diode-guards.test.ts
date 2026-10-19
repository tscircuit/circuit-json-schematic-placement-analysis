import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createAstraFuseDiode } from "../assets/astra-fuse-diode"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"

test("fuse-diode uses typed topology and skips ambiguous or unavailable evidence", async () => {
  const before = await createAstraFuseDiode(false, "pair"),
    after = await createAstraFuseDiode(true, "pair")
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["FuseDiodeNotAligned"],
    }).getIssues()
  const saved = JSON.stringify(before)
  expect(issues(before)).toHaveLength(1)
  expect(analyzeSchematicPlacement(before).getIssues()).toEqual(issues(before))
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()["FuseDiodeNotAligned"],
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<FuseDiodeNotAligned ",
  )
  expect(
    analyzeSchematicPlacement(before, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(issues(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") {
      e.name = "arbitrary"
      delete e.manufacturer_part_number
      delete e.supplier_part_numbers
    }
    if (e.type === "source_port") {
      e.name = "VIN_RESET_GATE"
      e.port_hints = ["GND", "VOUT"]
    }
    if (e.type === "source_net") e.name = "GND"
    if (e.type === "schematic_net_label") e.text = "VCC"
    if (e.type === "schematic_port") delete e.display_pin_label
  }
  expect(issues(renamed)).toHaveLength(1)
  // Rotating/translating or reflecting the whole circuit does not change the verdict.
  for (const source of [before, after])
    for (const turns of [0, 1, 2, 3])
      for (const reflect of [false, true]) {
        const j = structuredClone(source)
        const directions = ["right", "up", "left", "down"] as const
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
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  for (const name of ["F_MOTOR_VBUS", "D_MOTOR_BLOCK"]) {
    reject((j) => {
      box(j, name).schematic_sheet_id = "different-sheet"
    })
    reject((j) => {
      box(j, name).schematic_group_id = "different-group"
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
          pcb_component_id: "unpopulated",
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
  for (const [name, terminal] of [
    ["F_MOTOR_VBUS", "pin2"],
    ["D_MOTOR_BLOCK", "anode"],
  ] as const) {
    reject((j) => {
      port(j, name, terminal).do_not_connect = true
    })
    reject((j) => {
      const id = port(j, name, terminal).source_port_id
      const n = j.findIndex(
        (e) => e.type === "schematic_port" && e.source_port_id === id,
      )
      j.splice(n, 1)
    })
    reject((j) => {
      const id = port(j, name, terminal).source_port_id
      for (const e of j)
        if (e.type === "schematic_port" && e.source_port_id === id)
          e.center.x = Infinity
    })
    reject((j) => {
      const p = port(j, name, terminal)
      j.push({
        ...p,
        source_port_id: "extra-port",
        source_component_id: "another-component",
      })
      j.push({
        type: "source_trace",
        source_trace_id: "branch",
        connected_source_port_ids: [p.source_port_id, "extra-port"],
        connected_source_net_ids: [],
      })
    })
  }
  reject((j) => {
    const source = j.find(
      (e) =>
        e.type === "source_component" &&
        e.source_component_id === box(j, "F_MOTOR_VBUS").source_component_id,
    )!
    Object.assign(source, { ftype: "simple_chip" })
  })
  reject((j) => {
    const a = port(j, "F_MOTOR_VBUS", "pin1"),
      b = port(j, "F_MOTOR_VBUS", "pin2")
    j.push({
      type: "source_trace",
      source_trace_id: "short",
      connected_source_port_ids: [a.source_port_id, b.source_port_id],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    const a = port(j, "F_MOTOR_VBUS", "pin1"),
      b = port(j, "D_MOTOR_BLOCK", "cathode")
    j.push({
      type: "source_trace",
      source_trace_id: "parallel",
      connected_source_port_ids: [a.source_port_id, b.source_port_id],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    const id = port(j, "D_MOTOR_BLOCK", "anode").source_port_id
    for (const e of j)
      if (e.type === "schematic_port" && e.source_port_id === id)
        delete e.facing_direction
  })
  // Small symbol-origin offsets are tolerated; visibly staggered pins are not.
  for (const [dy, expected] of [
    [0.14, 0],
    [0.16, 1],
  ] as const) {
    const j = structuredClone(after),
      part = box(j, "F_MOTOR_VBUS")
    part.center.y += dy
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === part.schematic_component_id
      )
        e.center.y += dy
    expect(issues(j)).toHaveLength(expected)
  }
})
