import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createBicycleBrakeLights } from "../assets/bicycle-brake-light"
import { bicycleLightPlacements } from "../fixtures/parallel-led-branch-layouts"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import { createSectionedSchematicSnapshot } from "../fixtures/create-sectioned-schematic-snapshot"
import {
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

const issueTypes = ["ParallelLedBranchesDrawnInline"] as const

test("draws all six parallel LED branches side by side with a complete zero-finding Lights sheet", async () => {
  const before = await createBicycleBrakeLights()
  const control = await createBicycleBrakeLights({
    placements: bicycleLightPlacements(false),
  })
  const after = await createBicycleBrakeLights({
    placements: bicycleLightPlacements(true),
    schMaxTraceDistance: 30,
  })
  const electrical = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_trace",
        "source_net",
        "source_group",
        "source_bus",
        "source_component_internal_connection",
      ].includes(e.type),
    )
  for (const json of [before, control, after]) {
    expectReproRendered(json, 15)
    expect(electrical(json)).toEqual(electrical(before))
  }
  const baseline = analyzeSchematicPlacement(before)
  const intermediate = analyzeSchematicPlacement(control)
  const analysis = analyzeSchematicPlacement(after)
  expect(baseline.getIssues({ issueTypes })).toHaveLength(1)
  expect(baseline.getIssues()).toHaveLength(9)
  expect(intermediate.getIssues().map((i) => i.lineItemType)).toEqual([
    ...issueTypes,
  ])
  expect(analysis.getIssues()).toEqual([])
  const rotated = new Set([
    ...Array.from({ length: 6 }, (_, i) => `R${12 + i}`),
    ...Array.from({ length: 6 }, (_, i) => `D${i + 1}`),
    "R19",
  ])
  for (const source of before.filter((e) => e.type === "source_component")) {
    const b = getReproSchematicComponent(before, source.name!)
    const a = getReproSchematicComponent(after, source.name!)
    const turns = rotated.has(source.name!)
    expect(a).toEqual({
      ...b,
      center: a.center,
      size: a.size,
      symbol_name: turns
        ? source.ftype === "simple_led"
          ? "led_down"
          : "boxresistor_down"
        : b.symbol_name,
    })
    for (const port of before
      .filter((e) => e.type === "schematic_port")
      .filter((e) => e.schematic_component_id === b.schematic_component_id)) {
      const other = after.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === port.source_port_id,
      )
      if (other?.type !== "schematic_port")
        throw new Error("Missing corrected pin")
      expect(other.pin_number).toBe(port.pin_number)
      const dx = port.center.x - b.center.x,
        dy = port.center.y - b.center.y
      expect(other.center.x - a.center.x).toBeCloseTo(turns ? dy : dx, 6)
      expect(other.center.y - a.center.y).toBeCloseTo(turns ? -dx : dy, 6)
    }
  }
  // Walk actual routed wire edges, not source nets or matching labels.
  const edges = after.flatMap((e) =>
    e.type === "schematic_trace" ? e.edges : [],
  )
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  const pin = (name: string, n: string) => {
    const source = getReproSourcePort(after, name, n)
    const port = after.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === source.source_port_id,
    )
    if (port?.type !== "schematic_port")
      throw new Error("Missing wire endpoint")
    return key(port.center)
  }
  const wired = (endpoints: [string, string][]) => {
    const points = endpoints.map(([name, n]) => pin(name, n)),
      reached = new Set([points[0]!])
    const vertices = edges.flatMap((e) => [e.from, e.to])
    const onSegment = (
      p: { x: number; y: number },
      e: (typeof edges)[number],
    ) => {
      const dx = e.to.x - e.from.x,
        dy = e.to.y - e.from.y
      return (
        Math.abs((p.x - e.from.x) * dy - (p.y - e.from.y) * dx) < 1e-6 &&
        p.x >= Math.min(e.from.x, e.to.x) - 1e-6 &&
        p.x <= Math.max(e.from.x, e.to.x) + 1e-6 &&
        p.y >= Math.min(e.from.y, e.to.y) - 1e-6 &&
        p.y <= Math.max(e.from.y, e.to.y) + 1e-6
      )
    }
    const segments = edges.map((e) =>
      vertices.filter((p) => onSegment(p, e)).map(key),
    )
    let previous = -1
    while (previous !== reached.size) {
      previous = reached.size
      for (const segment of segments)
        if (segment.some((p) => reached.has(p)))
          for (const p of segment) reached.add(p)
    }
    for (const point of points) expect(reached.has(point)).toBe(true)
  }
  for (let i = 0; i < 6; i++)
    wired([
      [`R${12 + i}`, "pin2"],
      [`D${i + 1}`, "pin2"],
    ])
  wired(Array.from({ length: 6 }, (_, i) => [`R${12 + i}`, "pin1"]))
  wired([
    ...Array.from(
      { length: 6 },
      (_, i) => [`D${i + 1}`, "pin1"] as [string, string],
    ),
    ["Q1", "pin3"],
  ])
  wired([
    ["R18", "pin2"],
    ["Q1", "pin1"],
    ["R19", "pin1"],
  ])
  const contextSourceComponentIds = before.flatMap((e) =>
    e.type === "source_component" ? [e.source_component_id] : [],
  )
  for (const [name, json, a] of [
    ["comparison", before, baseline],
    ["existing-findings-fixed-comparison", control, intermediate],
  ] as const) {
    expect(
      createPlacementComparisonSvg({
        subject: "complete Lights sheet",
        before: { circuitJson: json, analysis: a },
        after: { circuitJson: after, analysis },
        issues: a.getIssues({ issueTypes }),
        contextSourceComponentIds,
        beforeDiagnostic: () =>
          "Six parallel resistor/LED branches are drawn end-to-end in the same rows or columns.",
        afterDiagnostic:
          "Six branches side by side with continuous shared rails.\nFull-sheet analysis: 0 reported issues.",
        note:
          name === "comparison"
            ? "All 15 components retained. Same electrical records and symbols, with placement and routing changes."
            : "Existing analyzers report 0 on the left; the new branch finding remains until the branches are arranged in parallel.",
        padding: { left: 1.5, right: 1.2, top: 1.3, bottom: 1.5 },
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
  expect(
    createSectionedSchematicSnapshot({
      circuitJson: after,
      analysis,
      sections: [
        {
          title: "Complete Lights sheet",
          componentNames: before.flatMap((e) =>
            e.type === "source_component" ? [e.name!] : [],
          ),
          padding: { left: 1, right: 1.2, top: 1, bottom: 1 },
        },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
