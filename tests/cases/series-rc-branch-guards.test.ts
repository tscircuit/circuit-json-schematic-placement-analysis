import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPeltierSeriesRc } from "../assets/peltier-series-rc"
import {
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("SeriesRcBranchNotGrouped requires unambiguous typed topology, independent of labels", async () => {
  const data = await createPeltierSeriesRc()
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, {
      issueTypes: ["SeriesRcBranchNotGrouped"],
    }).getIssues()
  const original = JSON.stringify(data)
  expect(issues(data)).toHaveLength(1)
  expect(
    analyzeSchematicPlacement(data).getIssues({
      issueTypes: ["SeriesRcBranchNotGrouped"],
    }),
  ).toEqual(issues(data))
  expect(
    analyzeSchematicPlacement(data, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  expect(
    analyzeSchematicPlacement(data).getIssues({ schematicSheetId: "other" }),
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
  expect(issues(renamed)).toHaveLength(1)
  const reject = (description: string, edit: (json: CircuitJson) => void) => {
    const json = structuredClone(data)
    edit(json)
    expect(issues(json), description).toEqual([])
  }
  for (const name of ["R_COMP", "C_COMP_ZERO", "C_COMP_POLE"]) {
    reject(`${name} has no placement`, (j) => {
      const b = getReproSchematicComponent(j, name)
      j.splice(j.indexOf(b), 1)
    })
    reject(`${name} has duplicate placements`, (j) => {
      const b = getReproSchematicComponent(j, name)
      j.push({ ...b, schematic_component_id: "duplicate" })
    })
    reject(`${name} has a missing pin`, (j) => {
      const p = getReproSourcePort(j, name, "pin1")
      const i = j.findIndex(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      j.splice(i, 1)
    })
    reject(`${name} has a duplicated pin`, (j) => {
      const p = getReproSourcePort(j, name, "pin1")
      const e = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      if (e?.type === "schematic_port")
        j.push({ ...e, schematic_port_id: "duplicate" })
    })
    reject(`${name} is on another sheet`, (j) => {
      getReproSchematicComponent(j, name).schematic_sheet_id = "other"
    })
    reject(`${name} is in another group`, (j) => {
      getReproSchematicComponent(j, name).schematic_group_id = "other"
    })
    reject(`${name} is unpopulated`, (j) => {
      j.push(
        pcb_component.parse({
          type: "pcb_component",
          pcb_component_id: "dnp",
          source_component_id: getReproSourcePort(j, name, "pin1")
            .source_component_id,
          center: { x: 0, y: 0 },
          width: 1,
          height: 1,
          rotation: 0,
          layer: "top",
          do_not_place: true,
        }),
      )
    })
    reject(`${name} has an invalid body`, (j) => {
      getReproSchematicComponent(j, name).size.width = 0
    })
    reject(`${name} has a disconnected pin`, (j) => {
      getReproSourcePort(j, name, "pin1").do_not_connect = true
    })
    reject(`${name} has a nonfinite pin`, (j) => {
      const p = getReproSourcePort(j, name, "pin1")
      const e = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      if (e?.type === "schematic_port") e.center.x = Number.NaN
    })
  }
  reject("supply rails alone are insufficient", (j) => {
    for (const e of j) if (e.type === "source_port") e.requires_power = true
  })
  const join = (j: CircuitJson, a: string, b: string) =>
    j.push({
      type: "source_trace",
      source_trace_id: `extra_${j.length}`,
      connected_source_port_ids: [a, b],
      connected_source_net_ids: [],
    })
  reject("shorted outer nodes", (j) =>
    join(
      j,
      getReproSourcePort(j, "R_COMP", "pin1").source_port_id,
      getReproSourcePort(j, "C_COMP_POLE", "pin2").source_port_id,
    ),
  )
  // Add an electrically connected, unplaced duplicate. It must count towards ambiguity.
  reject("unplaced extra bank member", (j) => {
    const id = getReproSourcePort(j, "C_COMP_POLE", "pin1").source_component_id
    const component = j.find(
      (e) => e.type === "source_component" && e.source_component_id === id,
    )
    if (component?.type !== "source_component") throw new Error("Missing part")
    j.push({ ...component, source_component_id: "extra", name: "extra" })
    for (const p of j.filter(
      (e) => e.type === "source_port" && e.source_component_id === id,
    )) {
      if (p.type !== "source_port") continue
      const extra = {
        ...p,
        source_component_id: "extra",
        source_port_id: `extra_${p.source_port_id}`,
      }
      j.push(extra)
      join(j, p.source_port_id, extra.source_port_id)
    }
  })

  for (const name of ["R_COMP", "C_COMP_ZERO", "C_COMP_POLE"])
    for (const value of [0, -1, Number.NaN])
      reject("invalid passive value", (j) => {
        const id = getReproSourcePort(j, name, "pin1").source_component_id
        const c = j.find(
          (e) => e.type === "source_component" && e.source_component_id === id,
        )
        if (c?.type === "source_component" && c.ftype === "simple_resistor")
          c.resistance = value
        if (c?.type === "source_component" && c.ftype === "simple_capacitor")
          c.capacitance = value
      })
  reject("private joint has another branch", (j) => {
    const p = getReproSourcePort(j, "R_COMP", "pin2")
    j.push({ ...p, source_component_id: "probe", source_port_id: "probe" })
    join(j, p.source_port_id, "probe")
  })
  reject("private joint is a supply", (j) => {
    getReproSourcePort(j, "R_COMP", "pin2").provides_power = true
  })
  reject("no parallel capacitor", (j) => {
    const id = getReproSourcePort(j, "C_COMP_POLE", "pin1").source_component_id
    const c = j.find(
      (e) => e.type === "source_component" && e.source_component_id === id,
    )
    if (c) Object.assign(c, { ftype: "simple_chip" })
  })
  // This is the author's later v0.4.8 placement, not a fabricated passing topology.
  expect(
    issues(
      await createPeltierSeriesRc({
        R_COMP: [4.8, -4.8, -90],
        C_COMP_ZERO: [4.8, -6.7, -90],
        C_COMP_POLE: [8, -4.8, -90],
      }),
    ),
  ).toEqual([])
  // Distances are independent of the chosen drawing axis and translation.
  expect(
    issues(
      await createPeltierSeriesRc({
        R_COMP: [10.78, 15.255, 90],
        C_COMP_ZERO: [6.82, 14.595, 0],
        C_COMP_POLE: [8.86, 16.015, 0],
      }),
    ),
  ).toHaveLength(1)
  const moved = structuredClone(data)
  // The opposite capacitor can be the separated member too; capacitance values
  // and COMP labels do not assign semantic roles to either branch.
  for (const e of moved)
    if (e.type === "source_component" && e.ftype === "simple_capacitor")
      e.capacitance = 1e-9
  expect(issues(moved)).toHaveLength(1)
  expect(issues([...data].reverse())).toHaveLength(1)
})
