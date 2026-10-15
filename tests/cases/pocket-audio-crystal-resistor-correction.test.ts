import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createPocketAudioClock } from "../assets/pocket-audio-clock"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import { createSectionedSchematicSnapshot } from "../fixtures/create-sectioned-schematic-snapshot"
import {
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups the crystal series resistor with a complete zero-finding Clock sheet", async () => {
  const capacitors = {
    C_XIN: { schX: 36, schY: 21 },
    C_XOUT: { schX: 40, schY: 21 },
  }
  const before = await createPocketAudioClock()
  const capsOnly = await createPocketAudioClock(capacitors)
  const after = await createPocketAudioClock({
    ...capacitors,
    R_XOUT: { schX: 42, schY: 23, schRotation: 180 },
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
  for (const json of [before, capsOnly, after]) {
    expectReproRendered(json, 5)
    expect(electrical(json)).toEqual(electrical(before))
  }
  const changed: string[] = []
  for (const name of ["U1", "Y1", "R_XOUT", "C_XIN", "C_XOUT"]) {
    const b = getReproSchematicComponent(before, name)
    const a = getReproSchematicComponent(after, name)
    expect(a).toEqual({
      ...b,
      center: a.center,
      symbol_name: name === "R_XOUT" ? "boxresistor_left" : b.symbol_name,
    })
    if (JSON.stringify(a.center) !== JSON.stringify(b.center))
      changed.push(name)
    for (const p of before
      .filter((e) => e.type === "schematic_port")
      .filter((e) => e.schematic_component_id === b.schematic_component_id)) {
      const q = after.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )
      if (q?.type !== "schematic_port") throw new Error("Missing corrected pin")
      expect(q.pin_number).toBe(p.pin_number)
      const sign = name === "R_XOUT" ? -1 : 1
      expect(q.center.x - a.center.x).toBeCloseTo(
        sign * (p.center.x - b.center.x),
        6,
      )
      expect(q.center.y - a.center.y).toBeCloseTo(
        sign * (p.center.y - b.center.y),
        6,
      )
    }
  }
  expect(changed.sort()).toEqual(["C_XIN", "C_XOUT", "R_XOUT"])
  expect(getReproSchematicComponent(capsOnly, "R_XOUT")).toEqual(
    getReproSchematicComponent(before, "R_XOUT"),
  )
  const baseline = analyzeSchematicPlacement(before)
  const afterCaps = analyzeSchematicPlacement(capsOnly)
  const analysis = analyzeSchematicPlacement(after)
  expect(baseline.getIssues().map((i) => i.lineItemType)).toEqual([
    "RailPathTooSpreadOut",
    "CrystalSeriesResistorNotGrouped",
  ])
  // Removing the old ground-route finding still leaves the new resistor finding.
  expect(afterCaps.getIssues().map((i) => i.lineItemType)).toEqual([
    "CrystalSeriesResistorNotGrouped",
  ])
  expect(analysis.getIssues()).toEqual([])

  const pins = [
    ["Y1", "pin3"],
    ["R_XOUT", "pin2"],
  ].map(([name, pin]) => {
    const source = getReproSourcePort(after, name!, pin!)
    const rendered = after.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === source.source_port_id,
    )
    if (rendered?.type !== "schematic_port")
      throw new Error("Missing local wire endpoint")
    return rendered.center
  })
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  const edges = after.flatMap((e) =>
    e.type === "schematic_trace" ? e.edges : [],
  )
  const reached = new Set([key(pins[0]!)])
  let previous = -1
  while (previous !== reached.size) {
    previous = reached.size
    for (const edge of edges) {
      if (reached.has(key(edge.from))) reached.add(key(edge.to))
      if (reached.has(key(edge.to))) reached.add(key(edge.from))
    }
  }
  expect(reached.has(key(pins[1]!))).toBe(true)
  expect(
    createPlacementComparisonSvg({
      subject: "complete Clock sheet",
      before: { circuitJson: before, analysis: baseline },
      after: { circuitJson: after, analysis },
      issues: baseline.getIssues(),
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: (issue) =>
        issue.lineItemType === "CrystalSeriesResistorNotGrouped"
          ? "R_XOUT is separated from the crystal's signal branch."
          : "Y1's ground route is spread out across the sheet.",
      afterDiagnostic:
        "Series resistor beside Y1, load capacitors nearby.\nFull-sheet analysis: 0 reported issues.",
      note: "Same pin connections and symbols; only the resistor and two load capacitors move.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    createSectionedSchematicSnapshot({
      circuitJson: after,
      analysis,
      sections: [
        {
          title: "Complete Clock sheet",
          componentNames: ["U1", "Y1", "R_XOUT", "C_XIN", "C_XOUT"],
          padding: { left: 0.8, right: 1, top: 1, bottom: 0.8 },
        },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
