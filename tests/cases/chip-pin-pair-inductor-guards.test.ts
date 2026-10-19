import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createRemoteChipPinInductor } from "../assets/remote-chip-pin-inductor"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"

test("chip-pin-pair-inductor uses typed topology and skips ambiguous or unavailable evidence", async () => {
  const before = await createRemoteChipPinInductor(false, "pair"),
    after = await createRemoteChipPinInductor(true, "pair")
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["InductorSeparatedFromChipPins"],
    }).getIssues()
  const saved = JSON.stringify(before)
  expect(issues(before)).toHaveLength(1)
  expect(analyzeSchematicPlacement(before).getIssues()).toEqual(issues(before))
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()[
      "InductorSeparatedFromChipPins"
    ],
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<InductorSeparatedFromChipPins ",
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
  for (const name of ["L1", "U2"]) {
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
    ["L1", "pin1"],
    ["U2", "pin9"],
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
        e.source_component_id === box(j, "L1").source_component_id,
    )!
    Object.assign(source, { ftype: "simple_chip" })
  })
  reject((j) => {
    const a = port(j, "L1", "pin1"),
      b = port(j, "L1", "pin2")
    j.push({
      type: "source_trace",
      source_trace_id: "short",
      connected_source_port_ids: [a.source_port_id, b.source_port_id],
      connected_source_net_ids: [],
    })
  })
  for (const flag of [
    "requires_power",
    "provides_power",
    "requires_ground",
    "provides_ground",
    "requires_voltage",
    "provides_voltage",
  ] as const) {
    for (const [name, terminal] of [
      ["U2", "pin9"],
      ["L1", "pin2"],
    ] as const)
      reject((j) => {
        Object.assign(port(j, name, terminal), {
          [flag]: flag.endsWith("voltage") ? 0 : true,
        })
      })
  }
  for (const flag of ["is_power", "is_ground", "is_positive_voltage_source"])
    reject((j) => {
      const p = port(j, "L1", "pin1")
      j.push({
        type: "source_net",
        source_net_id: "rail",
        name: "arbitrary",
        member_source_group_ids: [],
        ...{ [flag]: true },
        subcircuit_connectivity_map_key: p.subcircuit_connectivity_map_key,
      })
    })
  reject((j) => {
    port(j, "U2", "pin7").source_component_id = "different-chip"
  })
  reject((j) => {
    const id = port(j, "U2", "pin7").source_port_id
    for (const e of j)
      if (e.type === "schematic_port" && e.source_port_id === id)
        e.facing_direction = "left"
  })
  // A nearby inductor need not be perfectly centered on the pin pair.
  for (const [distance, expected] of [
    [2.99, 0],
    [3.01, 1],
  ] as const) {
    const j = structuredClone(after),
      part = box(j, "L1")
    const pin = (name: string, n: string) => {
      const id = port(j, name, n).source_port_id
      const p = j.find(
        (e) => e.type === "schematic_port" && e.source_port_id === id,
      )
      if (p?.type !== "schematic_port") throw new Error("Missing pin")
      return p
    }
    const a = pin("L1", "pin1"),
      b = pin("U2", "pin9")
    const dx =
      b.center.x +
      Math.sqrt(distance ** 2 - (a.center.y - b.center.y) ** 2) -
      a.center.x
    part.center.x += dx
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === part.schematic_component_id
      )
        e.center.x += dx
    expect(issues(j)).toHaveLength(expected)
  }
})
