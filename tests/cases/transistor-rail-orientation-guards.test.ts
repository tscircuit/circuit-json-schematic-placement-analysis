import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createQrngDualAmplifier } from "../assets/qrng-dual-amplifier"
import {
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("transistor rail orientation requires typed devices, positive rails, distinct nets and local opposing branches", async () => {
  const data = await createQrngDualAmplifier()
  const issues = (c: CircuitJson) =>
    analyzeSchematicPlacement(c, {
      issueTypes: ["TransistorHasIncorrectRailOrientation"],
    }).getIssues()
  const original = JSON.stringify(data)
  const baseline = issues(data)
  expect(baseline).toHaveLength(2)
  expect(
    baseline.every(
      (i) =>
        i.lineItemType === "TransistorHasIncorrectRailOrientation" &&
        i.deltaSchRotation === 270,
    ),
  ).toBe(true)
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["TransistorHasIncorrectRailOrientation"],
    }),
  ).toEqual(baseline)
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
  const reject = (edit: (c: CircuitJson) => void) => {
    const c = structuredClone(data)
    edit(c)
    expect(issues(c)).toEqual([])
  }
  reject((c) => {
    for (const e of c)
      if (e.type === "source_net") e.is_positive_voltage_source = false
  })
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
      if (e.type === "source_net" && e.is_positive_voltage_source)
        e.is_ground = true
  })
  reject((c) => {
    for (const e of c)
      if (e.type === "source_component" && e.ftype === "simple_resistor")
        e.resistance = 0
  })
  reject((c) => {
    for (let i = 0; i < c.length; i++) {
      const e = c[i]!
      if (e.type === "source_component" && e.ftype === "simple_transistor")
        c[i] = { ...e, ftype: "simple_chip" }
    }
  })
  reject((c) => {
    for (const name of ["Q1", "Q2"])
      getReproSourcePort(c, name, "base").do_not_connect = true
  })
  reject((c) => {
    for (const name of ["R1E", "R2E"])
      getReproSourcePort(c, name, "pin1").do_not_connect = true
  })
  reject((c) => {
    for (const name of ["Q1", "Q2"]) {
      const box = getReproSchematicComponent(c, name)
      c.push({ ...box, schematic_component_id: `duplicate_${name}` })
    }
  })
  reject((c) => {
    for (const name of ["Q1", "Q2"]) {
      const p = getReproSourcePort(c, name, "collector")
      const geometry = c.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      if (geometry?.type === "schematic_port") delete geometry.facing_direction
    }
  })
  reject((c) => {
    for (const name of ["Q1", "Q2"]) {
      const p = getReproSourcePort(c, name, "collector")
      const geometry = c.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      if (geometry?.type === "schematic_port")
        c.push({ ...geometry, schematic_port_id: `duplicate_${name}` })
    }
  })
  reject((c) => {
    for (const name of ["R1C", "R2C"])
      getReproSchematicComponent(c, name).schematic_sheet_id = "other-sheet"
  })
  reject((c) => {
    for (const name of ["R1E", "R2E"])
      getReproSchematicComponent(c, name).schematic_group_id = "other-group"
  })
  reject((c) => {
    for (const name of ["Q1", "Q2"])
      getReproSchematicComponent(c, name).center.x = Number.NaN
  })
  reject((c) => {
    for (const name of ["Q1", "Q2"]) {
      const p = getReproSourcePort(c, name, "collector")
      c.push(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: name,
          source_component_id: p.source_component_id,
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
    for (const name of ["Q1", "Q2"])
      c.push({
        type: "source_trace",
        source_trace_id: `short_${name}`,
        connected_source_net_ids: [],
        connected_source_port_ids: [
          getReproSourcePort(c, name, "base").source_port_id,
          getReproSourcePort(c, name, "emitter").source_port_id,
        ],
      })
  })
  reject((c) => {
    for (const name of ["R1C", "R2C"]) {
      const placed = getReproSchematicComponent(c, name)
      const source = c.find(
        (e) =>
          e.type === "source_component" &&
          e.source_component_id === placed.source_component_id,
      )!
      if (source.type !== "source_component")
        throw new Error("Missing resistor")
      const sourceId = `extra_${source.source_component_id}`
      const schematicId = `extra_${placed.schematic_component_id}`
      const originalPorts = c.filter(
        (e) =>
          e.type === "source_port" &&
          e.source_component_id === source.source_component_id,
      )
      c.push({ ...source, source_component_id: sourceId })
      c.push({
        ...placed,
        source_component_id: sourceId,
        schematic_component_id: schematicId,
      })
      for (const p of originalPorts) {
        if (p.type !== "source_port") continue
        const geometry = c.find(
          (e) =>
            e.type === "schematic_port" &&
            e.source_port_id === p.source_port_id,
        )
        const sourcePortId = `extra_${p.source_port_id}`
        c.push({
          ...p,
          source_component_id: sourceId,
          source_port_id: sourcePortId,
        })
        if (geometry?.type === "schematic_port")
          c.push({
            ...geometry,
            source_port_id: sourcePortId,
            schematic_component_id: schematicId,
            schematic_port_id: `extra_${geometry.schematic_port_id}`,
          })
      }
    }
  })
  // Rotation is directional: a 270° rotation fixes both stages, 90° inverts them.
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
    expect(found).toHaveLength(turns === 3 ? 0 : 2)
    if (turns !== 3)
      expect(
        found.every(
          (i) =>
            i.lineItemType === "TransistorHasIncorrectRailOrientation" &&
            i.deltaSchRotation === (turns === 1 ? 180 : 90),
        ),
      ).toBe(true)
  }
})
