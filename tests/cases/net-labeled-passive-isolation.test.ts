import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createNetLabeledPassiveIsolationFixture } from "../fixtures/net-labeled-passive-isolation"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

const issueTypes = ["NetLabeledPassiveIsolated"] as const
const analyze = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes })

test("reports one passive only when both labeled terminals are far from their connected pins", () => {
  const base = createNetLabeledPassiveIsolationFixture()
  const original = JSON.stringify(base)
  expect(analyze(base).getIssues()).toMatchObject([
    {
      passiveComponent: { sourceComponentName: "passive" },
      connectedComponents: [
        { sourceComponentName: "left" },
        { sourceComponentName: "right" },
      ],
      pinDistances: [5.75, 5.75],
      maxRecommendedPinDistance: 3,
    },
  ])
  expect(analyzeSchematicPlacement(base).getIssues({ issueTypes })).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: base,
      analysis: analyze(base),
      highlightIssues: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "isolated")
  const moveLeft = (json: CircuitJson, distance: number) => {
    const shift = 5.75 - distance
    for (const e of json) {
      if (e.type === "schematic_component" && e.source_component_id === "left")
        e.center.x += shift
      if (e.type === "schematic_port" && e.source_port_id === "left_pin")
        e.center.x += shift
      if (e.type === "schematic_trace" && e.source_trace_id === "src_left_pin")
        for (const edge of e.edges) {
          edge.from.x += shift
          edge.to.x += shift
        }
      if (
        e.type === "schematic_net_label" &&
        e.source_trace_id === "src_left_pin"
      ) {
        e.center.x += shift
        if (e.anchor_position) e.anchor_position.x += shift
      }
    }
  }
  const guards: Record<string, (json: CircuitJson) => void> = {
    "close to one endpoint": (json) => moveLeft(json, 1),
    "exact distance boundary": (json) => moveLeft(json, 3),
    "one unlabeled terminal": (json) => {
      const i = json.findIndex(
        (e) =>
          e.type === "schematic_net_label" &&
          e.schematic_net_label_id === "label_passive_right",
      )
      json.splice(i, 1)
    },
    "unproved label identity": (json) => {
      for (const e of json)
        if (e.type === "schematic_net_label") e.source_net_id = "unrelated"
    },
    "supply net": (json) => {
      for (const e of json)
        if (e.type === "source_net" && e.source_net_id === "net_right")
          e.is_power = true
    },
    "ground pin": (json) => {
      for (const e of json)
        if (e.type === "source_port" && e.source_port_id === "right_pin")
          e.requires_ground = true
    },
    "noncomponent supply": (json) => {
      json.push(
        {
          type: "source_port",
          source_port_id: "supply",
          name: "arbitrary",
          port_hints: [],
          provides_power: true,
        },
        {
          type: "source_trace",
          source_trace_id: "supply_link",
          connected_source_port_ids: ["supply"],
          connected_source_net_ids: ["net_right"],
        },
      )
    },
    "disconnected pin": (json) => {
      for (const e of json)
        if (e.type === "source_port" && e.source_port_id === "passive_left")
          e.do_not_connect = true
    },
    fanout: (json) => {
      json.push(
        {
          type: "source_port",
          source_port_id: "fanout",
          source_component_id: "right",
          name: "other",
          port_hints: [],
        },
        {
          type: "source_trace",
          source_trace_id: "fanout_link",
          connected_source_port_ids: ["fanout"],
          connected_source_net_ids: ["net_left"],
        },
      )
    },
    "shorted passive": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_port_ids: [],
        connected_source_net_ids: ["net_left", "net_right"],
      })
    },
    "different sheet": (json) => {
      for (const e of json)
        if (
          e.type === "schematic_component" &&
          e.source_component_id === "right"
        )
          e.schematic_sheet_id = "other"
    },
    "different group": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.source_component_id === "right")
          e.source_group_id = "other"
    },
    "duplicate pin": (json) => {
      const p = json.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === "passive_left",
      )!
      json.push({ ...p, schematic_port_id: "duplicate" } as CircuitJson[number])
    },
    "missing pin": (json) => {
      json.splice(
        json.findIndex(
          (e) =>
            e.type === "schematic_port" && e.source_port_id === "right_pin",
        ),
        1,
      )
    },
    "duplicate component": (json) => {
      const c = json.find(
        (e) =>
          e.type === "schematic_component" &&
          e.source_component_id === "passive",
      )!
      json.push({
        ...c,
        schematic_component_id: "duplicate",
      } as CircuitJson[number])
    },
    "invalid geometry": (json) => {
      for (const e of json)
        if (e.type === "schematic_port" && e.source_port_id === "right_pin")
          e.center.x = Number.NaN
    },
    "unknown passive type": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.source_component_id === "passive"
        )
          Object.assign(e, { ftype: "simple_chip" })
    },
    "branched stub": (json) => {
      for (const e of json)
        if (
          e.type === "schematic_trace" &&
          e.source_trace_id === "src_passive_left"
        )
          e.junctions = [e.edges[0]!.to]
    },
    "visible wire": (json) => {
      for (const e of json)
        if (
          e.type === "schematic_trace" &&
          e.source_trace_id === "src_passive_left"
        )
          e.edges[0]!.to = { x: 0.5, y: 0 }
    },
    "scaled symbol": (json) => {
      for (const e of json)
        if (
          e.type === "schematic_component" &&
          e.source_component_id === "passive"
        )
          e.size = { width: 2, height: 1 }
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(base)
    mutate(json)
    expect(analyze(json).getIssues(), name).toEqual([])
  }
  const near = structuredClone(base)
  moveLeft(near, 2.5)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: near,
      analysis: analyze(near),
    }),
  ).toMatchSvgSnapshot(import.meta.path, "near-one-pin")
  const over = structuredClone(base)
  moveLeft(over, 3.01)
  expect(analyze(over).getIssues()).toHaveLength(1)
  const misleading = structuredClone(base)
  for (const e of misleading) {
    if (
      e.type === "source_component" ||
      e.type === "source_port" ||
      e.type === "source_net"
    )
      e.name = "GND"
    if (e.type === "schematic_net_label") e.text = "POWER"
  }
  expect(analyze(misleading).getIssues()).toHaveLength(1)
  for (const ftype of ["simple_capacitor", "simple_inductor"]) {
    const json = structuredClone(base)
    for (const e of json)
      if (e.type === "source_component" && e.source_component_id === "passive")
        Object.assign(e, { ftype })
    expect(analyze(json).getIssues()).toHaveLength(1)
  }
  expect(JSON.stringify(base)).toBe(original)
})
