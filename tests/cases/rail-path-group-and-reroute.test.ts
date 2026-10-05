import { expect, test } from "bun:test"
import type { CircuitJson, SchematicTrace } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import {
  rectPolygon,
  segmentCrossesPolygon,
} from "lib/utils/schematic-text-geometry"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { compactRailPathRepro } from "../fixtures/compact-rail-path-repro"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("group the existing four support elements and recompute all traces without changing connectivity", () => {
  const before = createRailPathRepro()
  const serialized = JSON.stringify(before)
  const after = compactRailPathRepro(before)
  expect(JSON.stringify(before)).toBe(serialized)
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  expect(
    after
      .filter((e) => e.type === "schematic_net_label")
      .map((e) => e.schematic_net_label_id),
  ).toEqual(
    before
      .filter((e) => e.type === "schematic_net_label")
      .map((e) => e.schematic_net_label_id),
  )
  const components = after.filter((e) => e.type === "schematic_component")
  for (const id of ["sch-series", "sch-upper", "sch-lower", "sch-filter"]) {
    const old = before.find(
      (e) =>
        e.type === "schematic_component" && e.schematic_component_id === id,
    )!
    const moved = components.find((e) => e.schematic_component_id === id)!
    expect(moved.center).not.toEqual((old as typeof moved).center)
    expect(Math.hypot(moved.center.x - 5, moved.center.y - 3)).toBeLessThan(2.6)
  }
  const host = (c: CircuitJson) =>
    c.find(
      (e) =>
        e.type === "schematic_component" &&
        e.schematic_component_id === "sch-host",
    )
  expect(host(after)).toEqual(host(before))
  const traces = (c: CircuitJson) =>
    c.filter((e): e is SchematicTrace => e.type === "schematic_trace")
  expect(traces(after)).toHaveLength(6)
  for (const trace of traces(after)) {
    const old = traces(before).find(
      (e) => e.schematic_trace_id === trace.schematic_trace_id,
    )!
    expect(trace.edges).not.toEqual(old.edges)
    expect(trace.subcircuit_connectivity_map_key).toBe(
      old.subcircuit_connectivity_map_key,
    )
    for (const edge of trace.edges) {
      expect(edge.from.x === edge.to.x || edge.from.y === edge.to.y).toBe(true)
      for (const c of components) {
        const bounds = {
          left: c.center.x - c.size.width / 2,
          right: c.center.x + c.size.width / 2,
          bottom: c.center.y - c.size.height / 2,
          top: c.center.y + c.size.height / 2,
        }
        expect(
          segmentCrossesPolygon(edge.from, edge.to, rectPolygon(bounds)),
        ).toBe(false)
      }
    }
  }
  // Different source nets must not gain an accidental geometric contact.
  const routed = traces(after)
  for (let i = 0; i < routed.length; i++)
    for (const other of routed.slice(i + 1)) {
      const first = routed[i]!
      if (
        first.subcircuit_connectivity_map_key ===
        other.subcircuit_connectivity_map_key
      )
        continue
      for (const a of first.edges)
        for (const b of other.edges) {
          const touches =
            Math.max(Math.min(a.from.x, a.to.x), Math.min(b.from.x, b.to.x)) <=
              Math.min(Math.max(a.from.x, a.to.x), Math.max(b.from.x, b.to.x)) +
                1e-6 &&
            Math.max(Math.min(a.from.y, a.to.y), Math.min(b.from.y, b.to.y)) <=
              Math.min(Math.max(a.from.y, a.to.y), Math.max(b.from.y, b.to.y)) +
                1e-6
          expect(touches).toBe(false)
        }
    }
  // Verify actual drawn connectivity at the translated pins, not just net keys.
  const parents = new Map<string, string>()
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  const root = (id: string): string =>
    parents.has(id) ? root(parents.get(id)!) : id
  for (const t of traces(after))
    for (const edge of t.edges) {
      const a = root(key(edge.from)),
        b = root(key(edge.to))
      if (a !== b) parents.set(b, a)
    }
  const portKey = (id: string) => {
    const p = after.find(
      (e) => e.type === "schematic_port" && e.schematic_port_id === id,
    )
    if (p?.type !== "schematic_port") throw Error(id)
    return key(p.center)
  }
  for (const pins of [
    ["sch-host-sense", "sch-series-right"],
    ["sch-series-left", "sch-upper-top"],
    ["sch-upper-bottom", "sch-lower-top", "sch-filter-top"],
  ])
    expect(new Set(pins.map((id) => root(portKey(id)))).size).toBe(1)
  for (const [portId, labelId] of [
    ["sch-lower-bottom", "label-lower"],
    ["sch-filter-bottom", "label-filter"],
  ]) {
    const label = after.find(
      (e) =>
        e.type === "schematic_net_label" &&
        e.schematic_net_label_id === labelId,
    )
    if (label?.type !== "schematic_net_label") throw Error(labelId)
    expect(root(portKey(portId!))).toBe(root(key(label.anchor_position)))
  }
  const totalLength = (c: CircuitJson) =>
    traces(c)
      .flatMap((t) => t.edges)
      .reduce(
        (sum, e) => sum + Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y),
        0,
      )
  expect(totalLength(after)).toBeLessThan(totalLength(before) / 2)
  const options = { issueTypes: ["RailPathTooSpreadOut"] as const }
  const beforeAnalysis = analyzeSchematicPlacement(before, options),
    afterAnalysis = analyzeSchematicPlacement(after, options)
  expect(beforeAnalysis.getIssues()).toHaveLength(1)
  expect(afterAnalysis.getIssues()).toEqual([])
  expect(
    stackSvgsVertically(
      [
        createIssueReproSnapshot({
          circuitJson: before,
          analysis: beforeAnalysis,
          width: 1100,
          height: 750,
          showFullSchematic: true,
        }),
        createIssueReproSnapshot({
          circuitJson: after,
          analysis: afterAnalysis,
          width: 1100,
          height: 750,
          showFullSchematic: true,
        }),
      ],
      { normalizeSize: false, gap: 12 },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
