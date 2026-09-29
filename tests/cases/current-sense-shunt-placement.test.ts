import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createCurrentSenseShuntPlacement } from "../assets/current-sense-shunt-placement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups a displaced current-sense shunt without requiring vertical orientation or direct wiring everywhere", async () => {
  const before = await createCurrentSenseShuntPlacement()
  const after = await createCurrentSenseShuntPlacement("beside-inputs")
  const horizontal = await createCurrentSenseShuntPlacement("horizontal-direct")
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, {
      issueTypes: ["CurrentSenseShuntSeparatedFromInputs"],
    }).getIssues()
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  // TI INA241 Figure 8-1 uses a horizontal shunt with two visible sense branches.
  expect(issues(horizontal)).toEqual([])
  expect(after.filter((element) => element.type.startsWith("source_"))).toEqual(
    before.filter((element) => element.type.startsWith("source_")),
  )
  expect(getReproSchematicComponent(after, "U1")).toEqual(
    getReproSchematicComponent(before, "U1"),
  )
  for (const [variant, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproRendered(json, 2)
    expectReproNets(json, [
      ["RSHUNT.pin1", "U1.IN_POS"],
      ["RSHUNT.pin2", "U1.IN_NEG"],
    ])
    expect(
      analyzeSchematicPlacement(json).getIssues({
        issueTypes: ["CurrentSenseShuntSeparatedFromInputs"],
      }),
    ).toEqual(issues(json))
    const svg = createSchematicAnalysisFixtureSvg({
      circuitJson: json,
      highlightIssues: ["CurrentSenseShuntSeparatedFromInputs"],
    })
    if (variant === "before") {
      expect(svg).toContain('data-listing-issue-number="1"')
      expect([...svg.matchAll(/class="issue-marker"/g)]).toHaveLength(2)
    }
    expect(svg).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }

  const guards: Record<string, (json: CircuitJson) => void> = {
    "small offset": (json) => {
      getReproSchematicComponent(json, "RSHUNT").center.y = 1
    },
    "remote shunt": (json) => {
      getReproSchematicComponent(json, "RSHUNT").center.y = 20
    },
    "separate sheet": (json) => {
      getReproSchematicComponent(json, "RSHUNT").schematic_sheet_id = "other"
    },
    "separate block": (json) => {
      getReproSchematicComponent(json, "RSHUNT").schematic_group_id = "other"
    },
    "separate source group": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "RSHUNT")
          e.source_group_id = "other"
    },
    "separate subcircuit": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "RSHUNT")
          e.subcircuit_id = "other"
    },
    "unknown input roles": (json) => {
      const p = getReproSourcePort(json, "U1", "IN_POS")
      p.name = "SIG"
      p.port_hints = ["pin8"]
    },
    "conflicting aliases": (json) => {
      getReproSourcePort(json, "U1", "IN_POS").port_hints!.push("IN_NEG")
    },
    "not a shunt value": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.ftype === "simple_resistor")
          e.resistance = 10000
    },
    "zero-ohm link": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.ftype === "simple_resistor")
          e.resistance = 0
    },
    "missing pin": (json) => {
      const id = getReproSourcePort(json, "RSHUNT", "pin1").source_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    },
    "do not connect": (json) => {
      getReproSourcePort(json, "RSHUNT", "pin1").do_not_connect = true
    },
    "both branches labeled": (json) => {
      for (let i = json.length - 1; i >= 0; i--)
        if (json[i]!.type === "schematic_trace") json.splice(i, 1)
    },
    "missing label evidence": (json) => {
      for (let i = json.length - 1; i >= 0; i--)
        if (json[i]!.type === "schematic_net_label") json.splice(i, 1)
    },
    "ambiguous placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "RSHUNT"),
        schematic_component_id: "duplicate",
      })
    },
    "shorted input pair": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_port_ids: [
          getReproSourcePort(json, "U1", "IN_POS").source_port_id,
          getReproSourcePort(json, "U1", "IN_NEG").source_port_id,
        ],
        connected_source_net_ids: [],
      })
    },
    "parallel shunts": (json) => {
      const r = json.find(
        (e) => e.type === "source_component" && e.name === "RSHUNT",
      )!
      if (r.type !== "source_component") throw new Error("Missing resistor")
      json.push({ ...r, source_component_id: "parallel", name: "R2" })
      for (const pin of ["pin1", "pin2"])
        json.push({
          ...getReproSourcePort(json, "RSHUNT", pin),
          source_component_id: "parallel",
          source_port_id: `parallel-${pin}`,
        })
    },
    "shared sense input": (json) => {
      const amplifier = json.find(
        (e) => e.type === "source_component" && e.name === "U1",
      )!
      if (amplifier.type !== "source_component")
        throw new Error("Missing amplifier")
      json.push({
        ...amplifier,
        source_component_id: "shared-amplifier",
        name: "U2",
      })
      json.push({
        ...getReproSourcePort(json, "U1", "IN_POS"),
        source_component_id: "shared-amplifier",
        source_port_id: "shared-input",
      })
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = `part_${e.source_component_id}`
    if (
      e.type === "source_port" ||
      e.type === "source_net" ||
      e.type === "source_trace" ||
      e.type === "schematic_trace"
    )
      delete e.subcircuit_connectivity_map_key
  }
  expect(issues(renamed)).toHaveLength(1)

  // Trace records may be split at a T junction instead of containing both ports.
  const branched = structuredClone(horizontal)
  const shunt = getReproSchematicComponent(branched, "RSHUNT")
  const trace = branched.find(
    (e) =>
      e.type === "schematic_trace" &&
      e.edges.some((edge) => Math.abs(edge.from.y - shunt.center.y) < 0.01),
  )!
  if (trace.type !== "schematic_trace" || trace.edges.length < 2)
    throw new Error("Missing sense trace")
  const first = trace.edges[0]!
  const extension = {
    x: first.to.x + 2 * (first.to.x - first.from.x),
    y: first.to.y + 2 * (first.to.y - first.from.y),
  }
  branched.push({
    ...trace,
    schematic_trace_id: "sense-branch",
    edges: [{ from: first.from, to: extension }],
    junctions: [first.to],
  })
  trace.edges = trace.edges.slice(1)
  expect(issues(branched)).toEqual([])

  // Moving the whole drawing and rotating it must not change this relationship.
  const rotated = structuredClone(before)
  const rotate = (p: { x: number; y: number }) => ({ x: 10 - p.y, y: p.x - 5 })
  for (const e of rotated) {
    if (e.type === "schematic_component") {
      e.center = rotate(e.center)
      e.size = { width: e.size.height, height: e.size.width }
    }
    if (e.type === "schematic_port") {
      e.center = rotate(e.center)
      if (e.facing_direction)
        e.facing_direction = (
          { left: "down", right: "up", up: "left", down: "right" } as const
        )[e.facing_direction]
    }
    if (e.type === "schematic_trace")
      e.edges = e.edges.map((edge) => ({
        ...edge,
        from: rotate(edge.from),
        to: rotate(edge.to),
      }))
    if (e.type === "schematic_net_label") {
      if (e.anchor_position) e.anchor_position = rotate(e.anchor_position)
      e.center = rotate(e.center)
    }
  }
  expect(issues(rotated)).toHaveLength(1)
})
