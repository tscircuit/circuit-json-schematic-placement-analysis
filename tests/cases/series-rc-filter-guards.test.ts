import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPocketAudioDac } from "../assets/pocket-audio-dac"
import {
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("series RC grouping requires explicit ground and an unambiguous local signal pair, independently of names and orientation", async () => {
  const data = await createPocketAudioDac()
  const issues = (c: CircuitJson) =>
    analyzeSchematicPlacement(c, {
      issueTypes: ["SeriesRcFilterComponentsNotGrouped"],
    }).getIssues()
  const original = JSON.stringify(data)
  const baseline = issues(data)
  expect(baseline).toHaveLength(2)
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["SeriesRcFilterComponentsNotGrouped"],
    }),
  ).toEqual(baseline)
  expect(
    analyzeSchematicPlacement(data, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["SeriesRcFilterComponentsNotGrouped"],
      schematicSheetId: "elsewhere",
    }),
  ).toEqual([])
  expect(JSON.stringify(data)).toBe(original)
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
    ["R_DAC_L", "C_FILTER_L"],
    ["R_DAC_R", "C_FILTER_R"],
  ] as const
  const reject = (edit: (c: CircuitJson) => void) => {
    const c = structuredClone(data)
    edit(c)
    expect(issues(c)).toEqual([])
  }
  reject((c) => {
    for (const e of c) {
      if (e.type === "source_net") e.is_ground = false
      if (e.type === "source_port") {
        e.requires_ground = false
        e.provides_ground = false
      }
    }
  })
  reject((c) => {
    for (const e of c)
      if (e.type === "source_net" && e.is_ground) e.is_power = true
  })
  reject((c) => {
    for (const [r] of pairs)
      getReproSourcePort(c, r, "pin1").requires_power = true
  })
  reject((c) => {
    for (const [, cap] of pairs)
      getReproSourcePort(c, cap, "pin1").provides_voltage = 3.3
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
    for (const [r] of pairs)
      getReproSourcePort(c, r, "pin2").do_not_connect = true
  })
  reject((c) => {
    for (const [, cap] of pairs)
      getReproSourcePort(c, cap, "pin2").do_not_connect = true
  })
  reject((c) => {
    for (const [r] of pairs)
      getReproSchematicComponent(c, r).schematic_sheet_id = "other-sheet"
  })
  reject((c) => {
    for (const [, cap] of pairs)
      getReproSchematicComponent(c, cap).schematic_group_id = "other-group"
  })
  reject((c) => {
    for (const [, cap] of pairs)
      getReproSchematicComponent(c, cap).center.x = Number.NaN
  })
  reject((c) => {
    for (const [r] of pairs) {
      const b = getReproSchematicComponent(c, r)
      c.push({ ...b, schematic_component_id: `duplicate_${r}` })
    }
  })
  reject((c) => {
    for (const [, cap] of pairs) {
      const p = getReproSourcePort(c, cap, "pin1")
      const s = c.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      if (s?.type === "schematic_port")
        c.push({ ...s, schematic_port_id: `duplicate_${cap}` })
    }
  })
  reject((c) => {
    for (const [, cap] of pairs) {
      const b = getReproSchematicComponent(c, cap)
      c.push(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: cap,
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
    // Grounding the other resistor end creates parallel RC branches, handled separately.
    for (const [r, cap] of pairs)
      c.push({
        type: "source_trace",
        source_trace_id: `ground_${r}`,
        connected_source_net_ids: [],
        connected_source_port_ids: [
          getReproSourcePort(c, r, "pin1").source_port_id,
          getReproSourcePort(c, cap, "pin2").source_port_id,
        ],
      })
  })
  for (const bank of [true, false])
    reject((c) => {
      // A second output capacitor forms a bank; an input capacitor forms a C–R–C stage.
      for (const [r, cap] of pairs) {
        const p = getReproSourcePort(c, cap, "pin1")
        const ground = getReproSourcePort(c, cap, "pin2")
        const component = c.find(
          (e) =>
            e.type === "source_component" &&
            e.source_component_id === p.source_component_id,
        )!
        if (component.type !== "source_component")
          throw new Error("Missing capacitor")
        const id = `extra_${cap}`
        c.push({ ...component, source_component_id: id })
        c.push({ ...p, source_component_id: id, source_port_id: `${id}_1` })
        c.push({
          ...ground,
          source_component_id: id,
          source_port_id: `${id}_2`,
        })
        for (const [pin, target] of [
          [
            `${id}_1`,
            getReproSourcePort(c, r, bank ? "pin2" : "pin1").source_port_id,
          ],
          [`${id}_2`, ground.source_port_id],
        ])
          c.push({
            type: "source_trace",
            source_trace_id: `${id}_${pin}`,
            connected_source_net_ids: [],
            connected_source_port_ids: [pin!, target!],
          })
      }
    })
  reject((c) => {
    // Connecting the filter node to another terminal of the same host is ambiguous feedback.
    for (const [r] of pairs)
      c.push({
        type: "source_trace",
        source_trace_id: `feedback_${r}`,
        connected_source_net_ids: [],
        connected_source_port_ids: [
          getReproSourcePort(c, r, "pin2").source_port_id,
          getReproSourcePort(c, "U_DAC", "pin13").source_port_id,
        ],
      })
  })
  for (const turns of [1, 2, 3]) {
    const c = structuredClone(data)
    const directions = ["right", "up", "left", "down"] as const
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
      const previous = baseline[i]!
      if (
        issue.lineItemType !== "SeriesRcFilterComponentsNotGrouped" ||
        previous.lineItemType !== "SeriesRcFilterComponentsNotGrouped"
      )
        throw new Error("Unexpected issue")
      expect(issue.signalPinDistance).toBeCloseTo(previous.signalPinDistance)
    }
  }
})
