import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createCellSenseFilterLadder } from "../assets/cell-sense-filter-ladder-placement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups a cell-input RC ladder while accepting readable and ambiguous alternatives", async () => {
  const before = await createCellSenseFilterLadder()
  const after = await createCellSenseFilterLadder({ grouped: true })
  const issueTypes = ["CellSenseFilterLadderNotGrouped"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes }).getIssues()
  expect(issues(before)).toMatchObject([
    {
      monitorComponentName: "U1",
      resistorSchematicBoxes: [0, 1, 2, 3].map((i) => ({
        sourceComponentName: `R${i}`,
      })),
      capacitorSchematicBoxes: [0, 1, 2, 3].map((i) => ({
        sourceComponentName: `C${i}`,
      })),
    },
  ])
  expect(issues(after)).toEqual([])
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  for (const [variant, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproRendered(json, 9)
    expectReproNets(json, [
      ["U1.VC5", "U1.VC4", "U1.VC3", "R3.pin2", "C3.pin1"],
      ["U1.VC2", "R2.pin2", "C3.pin2", "C2.pin1"],
      ["U1.VC1", "R1.pin2", "C2.pin2", "C1.pin1"],
      ["U1.VC0", "R0.pin2", "C1.pin2", "C0.pin1"],
      ["U1.VSS", "R0.pin1", "C0.pin2", "net.GND"],
    ])
    const analysis = analyzeSchematicPlacement(json)
    expect(analysis.getIssues({ issueTypes })).toEqual(issues(json))
    expect(analysis.getIssueCounts().CellSenseFilterLadderNotGrouped).toBe(
      variant === "before" ? 1 : 0,
    )
    expect(
      analysis.getIssues({ issueTypes, schematicSheetId: "other" }),
    ).toEqual([])
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        analysis,
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }
  for (const options of [
    { lowestCellToGround: true },
    { groundedVc0: true },
    { cellCount: 5 },
  ]) {
    expect(issues(await createCellSenseFilterLadder(options))).toHaveLength(1)
    expect(
      issues(await createCellSenseFilterLadder({ ...options, grouped: true })),
    ).toEqual([])
  }
  // A readable ladder may be separate from the IC, horizontal, or mirrored.
  // This assertion transforms the entire schematic, preserving local geometry.
  for (const [a, b, c, d] of [
    [0, -1, 1, 0],
    [-1, 0, 0, 1],
  ]) {
    for (const [input, count] of [
      [before, 1],
      [after, 0],
    ] as const) {
      const json = structuredClone(input)
      for (const e of json) {
        if (e.type === "schematic_component" || e.type === "schematic_port") {
          const { x, y } = e.center
          e.center = { x: a! * x + b! * y, y: c! * x + d! * y }
          if (e.type === "schematic_component" && a === 0)
            e.size = { width: e.size.height, height: e.size.width }
        }
      }
      expect(issues(json)).toHaveLength(count)
    }
  }
  const separate = structuredClone(after)
  getReproSchematicComponent(separate, "U1").center.x += 100
  expect(issues(separate)).toEqual([])
  // No exact row/column alignment is required.
  const nearby = structuredClone(after)
  getReproSchematicComponent(nearby, "R2").center.y += 0.7
  getReproSchematicComponent(nearby, "C2").center.x += 0.6
  expect(issues(nearby)).toEqual([])

  const guards: Record<string, (json: CircuitJson) => void> = {
    "different sheet": (json) => {
      getReproSchematicComponent(json, "C2").schematic_sheet_id = "other"
    },
    "separate group": (json) => {
      getReproSchematicComponent(json, "R2").schematic_group_id = "other"
    },
    "separate source scope": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "R2")
          e.source_group_id = "other"
    },
    "missing input role": (json) => {
      const p = getReproSourcePort(json, "U1", "VC2")
      p.name = "pin3"
      p.port_hints = ["pin3"]
    },
    "ambiguous input role": (json) => {
      getReproSourcePort(json, "U1", "VC2").port_hints!.push("VC1")
    },
    "unknown ground role": (json) => {
      const p = getReproSourcePort(json, "U1", "VSS")
      p.name = "pin7"
      p.port_hints = ["pin7"]
    },
    "unconnected input": (json) => {
      getReproSourcePort(json, "U1", "VC2").do_not_connect = true
    },
    "unconnected passive": (json) => {
      getReproSourcePort(json, "C2", "pin1").do_not_connect = true
    },
    "missing pin geometry": (json) => {
      const id = getReproSourcePort(json, "R2", "pin1").source_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    },
    "duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "C2"),
        schematic_component_id: "duplicate",
      })
    },
    "shorted lower inputs": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_port_ids: [
          getReproSourcePort(json, "U1", "VC1").source_port_id,
          getReproSourcePort(json, "U1", "VC2").source_port_id,
        ],
        connected_source_net_ids: [],
      })
    },
    "shared raw cell taps": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "shared",
        connected_source_port_ids: [
          getReproSourcePort(json, "R1", "pin1").source_port_id,
          getReproSourcePort(json, "R2", "pin1").source_port_id,
        ],
        connected_source_net_ids: [],
      })
    },
    "zero-ohm link": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.name === "R2" &&
          e.ftype === "simple_resistor"
        )
          e.resistance = 0
    },
    "not an adjacent-cell capacitor": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "C2")
          e.ftype = "simple_chip"
    },
    "additional input branch": (json) => {
      const p = getReproSourcePort(json, "R2", "pin2")
      json.push({
        ...p,
        source_component_id: "extra",
        source_port_id: "extra-port",
      })
    },
    "parallel capacitor": (json) => {
      const p = getReproSourcePort(json, "C2", "pin1"),
        q = getReproSourcePort(json, "C2", "pin2")
      const component = json.find(
        (e) => e.type === "source_component" && e.name === "C2",
      )!
      json.push(
        {
          ...component,
          source_component_id: "parallel-cap",
        } as typeof component,
        {
          ...p,
          source_component_id: "parallel-cap",
          source_port_id: "extra-a",
        },
        {
          ...q,
          source_component_id: "parallel-cap",
          source_port_id: "extra-b",
        },
      )
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
      e.type === "source_trace"
    )
      delete e.subcircuit_connectivity_map_key
  }
  expect(issues(renamed)).toHaveLength(1)
})
