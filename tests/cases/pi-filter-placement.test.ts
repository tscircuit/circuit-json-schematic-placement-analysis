import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPiFilterPlacement } from "../assets/pi-filter-placement"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups signal pi filters while accepting readable alternatives and skipping ambiguous networks", async () => {
  const issueTypes = ["PiFilterComponentsNotGrouped"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()
  const before = await createPiFilterPlacement()
  const after = await createPiFilterPlacement({ grouped: true })
  expect(issues(before)).toMatchObject([
    {
      inductorSchematicBox: { sourceComponentName: "L1" },
      firstCapacitorSchematicBox: { sourceComponentName: "C1" },
      secondCapacitorSchematicBox: { sourceComponentName: "C2" },
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
    expectReproRendered(json, 3)
    expectReproNets(json, [
      ["C1.pin1", "L1.pin1"],
      ["L1.pin2", "C2.pin1"],
      ["C1.pin2", "C2.pin2", "net.GND"],
    ])
    const analysis = analyzeSchematicPlacement(json)
    expect(analysis.getIssues({ issueTypes })).toEqual(issues(json))
    expect(analysis.getIssueCounts().PiFilterComponentsNotGrouped).toBe(
      variant === "before" ? 1 : 0,
    )
    expect(
      analysis.getIssues({ issueTypes, schematicSheetId: "other" }),
    ).toEqual([])
    const svg = createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      issueTypes,
      showFullSchematic: true,
      showOverlay: true,
      showListingIssueMarkers: true,
      width: 1200,
      height: 600,
    })
    expect([...svg.matchAll(/data-issue-number="(\d+)"/g)]).toHaveLength(
      variant === "before" ? 3 : 0,
    )
    expect([
      ...svg.matchAll(/data-listing-issue-number="(\d+)"/g),
    ]).toHaveLength(variant === "before" ? 1 : 0)
    expect(svg).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }
  for (const options of [
    { mirrored: true },
    { rotation: 90 },
    { rotation: 180 },
    { rotation: 270 },
  ]) {
    expect(issues(await createPiFilterPlacement(options))).toHaveLength(1)
    expect(
      issues(await createPiFilterPlacement({ ...options, grouped: true })),
    ).toEqual([])
  }
  const guards: Record<string, (json: CircuitJson) => void> = {
    "power filter": (json) => {
      for (const e of json)
        if (e.type === "source_net" && e.name === "FILTER_IN") e.is_power = true
    },
    "unknown ground": (json) => {
      for (const e of json)
        if (e.type === "source_net") {
          e.is_ground = false
          e.name = "UNKNOWN"
        }
    },
    "different sheet": (json) => {
      getReproSchematicComponent(json, "C2").schematic_sheet_id = "other"
    },
    "separate block": (json) => {
      getReproSchematicComponent(json, "C2").schematic_group_id = "other"
    },
    "duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "C2"),
        schematic_component_id: "duplicate",
      })
    },
    "unconnected pin": (json) => {
      getReproSourcePort(json, "C2", "pin2").do_not_connect = true
    },
    "missing pin geometry": (json) => {
      const id = getReproSourcePort(json, "C2", "pin1").source_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    },
    "zero capacitance": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.ftype === "simple_capacitor" &&
          e.name === "C2"
        )
          e.capacitance = 0
    },
    "shorted series element": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_net_ids: [],
        connected_source_port_ids: [
          getReproSourcePort(json, "L1", "pin1").source_port_id,
          getReproSourcePort(json, "L1", "pin2").source_port_id,
        ],
      })
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
  const parallel = structuredClone(before)
  const c2 = parallel.find(
    (e) => e.type === "source_component" && e.name === "C2",
  )!
  if (c2.type !== "source_component") throw new Error("Missing C2")
  parallel.push({ ...c2, source_component_id: "parallel_cap", name: "C3" })
  for (const pin of ["pin1", "pin2"])
    parallel.push({
      ...getReproSourcePort(before, "C2", pin),
      source_component_id: "parallel_cap",
      source_port_id: `parallel_${pin}`,
    })
  expect(issues(parallel)).toEqual([])
  // Population flags are explicit; names such as DNP alone have no effect.
  parallel.push({
    type: "pcb_component",
    pcb_component_id: "optional",
    source_component_id: "parallel_cap",
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    do_not_place: true,
    obstructs_within_bounds: true,
  })
  expect(issues(parallel)).toHaveLength(1)
  parallel.push({
    ...(parallel.at(-1) as Extract<
      CircuitJson[number],
      { type: "pcb_component" }
    >),
    pcb_component_id: "populated_variant",
    do_not_place: false,
  })
  expect(issues(parallel)).toEqual([])
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
