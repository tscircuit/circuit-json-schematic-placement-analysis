import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createMiniMp3Headphones } from "../assets/mini-mp3-headphones"
import { createPocketAudioDac } from "../assets/pocket-audio-dac"
import {
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("high-pass RC grouping uses explicit ground and unambiguous local topology, independent of names and orientation", async () => {
  const data = await createMiniMp3Headphones()
  const issues = (c: CircuitJson) =>
    analyzeSchematicPlacement(c, {
      issueTypes: ["HighPassRcFilterComponentsNotGrouped"],
    }).getIssues()
  const original = JSON.stringify(data),
    baseline = issues(data)
  expect(baseline).toHaveLength(2)
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["HighPassRcFilterComponentsNotGrouped"],
    }),
  ).toEqual(baseline)
  expect(
    analyzeSchematicPlacement(data, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["HighPassRcFilterComponentsNotGrouped"],
      schematicSheetId: "elsewhere",
    }),
  ).toEqual([])
  expect(JSON.stringify(data)).toBe(original)
  expect(issues(await createPocketAudioDac())).toEqual([])
  const renamed = structuredClone(data)
  for (const e of renamed) {
    if (e.type === "source_component") {
      e.name = "unrelated"
      delete e.manufacturer_part_number
      delete e.supplier_part_numbers
    }
    if (e.type === "source_port") {
      e.name = "unrelated"
      e.port_hints = []
      delete e.most_frequently_referenced_by_name
    }
    if (e.type === "source_net") e.name = "unrelated"
    if (e.type === "schematic_net_label" || e.type === "schematic_text")
      e.text = "unrelated"
  }
  expect(issues(renamed)).toHaveLength(2)
  const pairs = [
    ["C43", "R25"],
    ["C44", "R26"],
  ] as const
  const reject = (edit: (c: CircuitJson) => void) => {
    const c = structuredClone(data)
    edit(c)
    expect(issues(c)).toEqual([])
  }
  const join = (c: CircuitJson, id: string, first: string, second: string) =>
    c.push({
      type: "source_trace",
      source_trace_id: id,
      connected_source_net_ids: [],
      connected_source_port_ids: [first, second],
    })
  const clearGround = (c: CircuitJson) => {
    for (const e of c) {
      if (e.type === "source_net") e.is_ground = false
      if (e.type === "source_port") {
        e.requires_ground = false
        e.provides_ground = false
      }
    }
  }
  reject(clearGround)
  const portGround = structuredClone(data)
  clearGround(portGround)
  getReproSourcePort(portGround, "J4", "pin1").requires_ground = true
  expect(issues(portGround)).toHaveLength(2)
  reject((c) => {
    for (const e of c)
      if (e.type === "source_net" && e.is_ground) e.is_power = true
  })
  for (const flag of [
    "requires_power",
    "provides_power",
    "requires_voltage",
    "provides_voltage",
  ] as const)
    reject((c) => {
      for (const [cap] of pairs) {
        const p = getReproSourcePort(c, cap, "pin1")
        if (flag === "requires_voltage" || flag === "provides_voltage")
          p[flag] = 3.3
        else p[flag] = true
      }
    })
  reject((c) => {
    for (const [, r] of pairs)
      getReproSourcePort(c, r, "pin1").requires_ground = true
  })
  reject((c) => {
    for (const e of c)
      if (e.type === "source_component" && e.ftype === "simple_resistor")
        e.resistance = 0
  })
  reject((c) => {
    for (const e of c)
      if (e.type === "source_component" && e.ftype === "simple_capacitor")
        e.capacitance = Number.NaN
  })
  reject((c) => {
    for (const [cap] of pairs)
      getReproSourcePort(c, cap, "pin2").do_not_connect = true
  })
  reject((c) => {
    for (const pin of ["pin2", "pin3"])
      getReproSourcePort(c, "J4", pin).do_not_connect = true
  })
  reject((c) => {
    for (const [cap] of pairs)
      getReproSchematicComponent(c, cap).schematic_sheet_id = "elsewhere"
  })
  reject((c) => {
    for (const [, r] of pairs)
      getReproSchematicComponent(c, r).schematic_group_id = "elsewhere"
  })
  reject((c) => {
    for (const e of c)
      if (e.type === "source_component" && e.name === "J4")
        e.source_group_id = "elsewhere"
  })
  reject((c) => {
    for (const [, r] of pairs)
      getReproSchematicComponent(c, r).center.x = Number.NaN
  })
  reject((c) => {
    for (const [cap] of pairs) {
      const b = getReproSchematicComponent(c, cap)
      c.push({ ...b, schematic_component_id: `duplicate_${cap}` })
    }
  })
  reject((c) => {
    for (const [, r] of pairs) {
      const p = getReproSourcePort(c, r, "pin1")
      const sp = c.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      if (sp?.type === "schematic_port")
        c.push({ ...sp, schematic_port_id: `duplicate_${r}` })
    }
  })
  reject((c) => {
    for (const [, r] of pairs) {
      const b = getReproSchematicComponent(c, r)
      c.push(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: r,
          source_component_id: b.source_component_id,
          center: { x: 0, y: 0 },
          width: 1,
          height: 1,
          rotation: 0,
          layer: "top",
          do_not_place: true,
        }),
      )
    }
  })
  reject((c) => {
    const b = getReproSchematicComponent(c, "J4")
    c.push(
      pcb_component.parse({
        type: "pcb_component",
        pcb_component_id: "host_dnp",
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
  reject((c) => {
    for (const [cap, r] of pairs)
      join(
        c,
        `parallel_${cap}`,
        getReproSourcePort(c, cap, "pin1").source_port_id,
        getReproSourcePort(c, r, "pin2").source_port_id,
      )
  })
  reject((c) => {
    for (const [cap] of pairs)
      join(
        c,
        `feedback_${cap}`,
        getReproSourcePort(c, cap, "pin1").source_port_id,
        getReproSourcePort(c, "J4", cap === "C43" ? "pin3" : "pin2")
          .source_port_id,
      )
  })
  // Another resistor/capacitor at either output destroys the unique C-R-load junction.
  for (const componentType of ["simple_resistor", "simple_capacitor"] as const)
    reject((c) => {
      for (const [cap, r] of pairs) {
        const name = componentType === "simple_resistor" ? r : cap,
          p = getReproSourcePort(c, name, "pin1")
        const source = c.find(
          (e) =>
            e.type === "source_component" &&
            e.source_component_id === p.source_component_id,
        )
        if (source?.type !== "source_component") throw Error("Missing part")
        const id = `extra_${name}`
        c.push({ ...source, source_component_id: id })
        c.push({ ...p, source_component_id: id, source_port_id: `${id}_1` })
        join(
          c,
          `extra_trace_${name}`,
          `${id}_1`,
          getReproSourcePort(c, cap, "pin2").source_port_id,
        )
      }
    })
  // Overlap belongs to the overlap analyzer, not a competing separation recommendation.
  reject((c) => {
    for (const [cap, r] of pairs)
      getReproSchematicComponent(c, r).center = {
        ...getReproSchematicComponent(c, cap).center,
      }
  })
  for (const turns of [1, 2, 3]) {
    const c = structuredClone(data),
      directions = ["right", "up", "left", "down"] as const
    for (const e of c) {
      if (e.type !== "schematic_component" && e.type !== "schematic_port")
        continue
      for (let i = 0; i < turns; i++) {
        const { x, y } = e.center
        e.center = { x: -y, y: x }
      }
      e.center.x += 50
      e.center.y -= 30
      if (e.type === "schematic_component" && turns % 2)
        e.size = { width: e.size.height, height: e.size.width }
      if (e.type === "schematic_port" && e.facing_direction)
        e.facing_direction =
          directions[(directions.indexOf(e.facing_direction) + turns) % 4]!
    }
    const found = issues(c)
    expect(found).toHaveLength(2)
    for (const [i, issue] of found.entries()) {
      const old = baseline[i]!
      if (
        issue.lineItemType !== "HighPassRcFilterComponentsNotGrouped" ||
        old.lineItemType !== "HighPassRcFilterComponentsNotGrouped"
      )
        throw Error("Unexpected issue")
      expect(issue.signalPinDistance).toBeCloseTo(old.signalPinDistance)
    }
  }
})
