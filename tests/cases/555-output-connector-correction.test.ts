import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { create555OutputConnector } from "../assets/555-output-connector"
import { create555TimingNetwork } from "../assets/555-timing-network"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"
const electrical = (j: CircuitJson) =>
  j
    .filter((e) => e.type.startsWith("source_") && !e.type.endsWith("_warning"))
    .map((e) =>
      e.type === "source_port"
        ? { ...e, port_hints: [...(e.port_hints ?? [])].sort() }
        : e,
    )
const relativePins = (j: CircuitJson) =>
  j.flatMap((e) => {
    if (e.type !== "schematic_port") return []
    const c = j.find(
      (c) =>
        c.type === "schematic_component" &&
        c.schematic_component_id === e.schematic_component_id,
    )
    if (c?.type !== "schematic_component") throw new Error("Missing component")
    return [
      {
        id: e.source_port_id,
        pin: e.pin_number,
        facing: e.facing_direction,
        x: +(e.center.x - c.center.x).toFixed(6),
        y: +(e.center.y - c.center.y).toFixed(6),
        symbol: c.symbol_name,
      },
    ]
  })
test("moves the 555 output connector to the pin side without changing either symbol or its pins", async () => {
  const before = await create555OutputConnector(),
    analysis = analyzeSchematicPlacement(before)
  const issue = analysis.getIssues()[0]!
  if (issue.lineItemType !== "ConnectorPositionCausesTraceDetours")
    throw new Error("Expected connector move")
  expect(issue.evaluatedSignalCount).toBe(1)
  const after = await create555OutputConnector({
      x: issue.newSchX,
      y: issue.newSchY,
    }),
    corrected = analyzeSchematicPlacement(after)
  expectReproRendered(after, 2)
  expect(electrical(after)).toEqual(electrical(before))
  expect(relativePins(after)).toEqual(relativePins(before))
  expect(corrected.getIssues()).toEqual([])
  const ids = [
    getReproSourcePort(after, "U1", "pin3").source_port_id,
    getReproSourcePort(after, "J_OUT", "pin1").source_port_id,
  ]
  const ends = ids.map((id) =>
    after.find((e) => e.type === "schematic_port" && e.source_port_id === id),
  )
  const points = ends.map((e) => {
    if (e?.type !== "schematic_port") throw new Error("Missing pin")
    return e.center
  })
  expect(points[0]!.y).toBeCloseTo(points[1]!.y, 6)
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) < 0.001
  expect(
    after.some(
      (e) =>
        e.type === "schematic_trace" &&
        e.edges.length > 0 &&
        e.edges.every(
          (edge, i) =>
            same({ x: 0, y: edge.from.y }, { x: 0, y: points[0]!.y }) &&
            same({ x: 0, y: edge.to.y }, { x: 0, y: points[0]!.y }) &&
            (i === 0 || same(e.edges[i - 1]!.to, edge.from)),
        ) &&
        ((same(e.edges[0]!.from, points[0]!) &&
          same(e.edges.at(-1)!.to, points[1]!)) ||
          (same(e.edges[0]!.from, points[1]!) &&
            same(e.edges.at(-1)!.to, points[0]!))),
    ),
  ).toBe(true)

  expect(
    createPlacementComparisonSvg({
      subject: "555 output connector",
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues: analysis.getIssues(),
      centerEachPanel: true,
      panelHeight: 650,
      padding: { left: 1, right: 1.8, top: 1.8, bottom: 1.3 },
      backgroundColor: "#f5f1ed",
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "J_OUT is behind U1's output; signal and ground wires wrap around the chip.",
      afterDiagnostic:
        "J_OUT faces the unchanged output pin through a straight signal wire.\nComplete 2-component extract: 0 reported issues.",
      note: "Native output extract from 555AstableMultivibrator v0.0.1. Chip and connector pin arrangements are unchanged.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  const fullBefore = await create555TimingNetwork(),
    fullAfter = await create555TimingNetwork(false, true, {
      x: issue.newSchX,
      y: issue.newSchY,
    })
  expectReproRendered(fullAfter, 7)
  const fullMove = analyzeSchematicPlacement(fullBefore).getIssues({
    issueTypes: ["ConnectorPositionCausesTraceDetours"],
  })[0]!
  if (fullMove.lineItemType !== "ConnectorPositionCausesTraceDetours")
    throw new Error("Missing complete-board move")
  const onlyMoved = await create555TimingNetwork(false, false, {
    x: fullMove.newSchX,
    y: fullMove.newSchY,
  })
  expect(electrical(onlyMoved)).toEqual(electrical(fullBefore))
  expect(relativePins(onlyMoved)).toEqual(relativePins(fullBefore))
  expect(
    analyzeSchematicPlacement(onlyMoved).getIssues({
      issueTypes: ["ConnectorPositionCausesTraceDetours"],
    }),
  ).toEqual([])
  expect(electrical(fullAfter)).toEqual(electrical(fullBefore))
  const fixedPortIds = new Set(
    fullBefore.flatMap((e) =>
      e.type === "source_port" &&
      fullBefore.some(
        (c) =>
          c.type === "source_component" &&
          c.source_component_id === e.source_component_id &&
          ["simple_chip", "simple_pin_header"].includes(c.ftype),
      )
        ? [e.source_port_id]
        : [],
    ),
  )
  expect(
    relativePins(fullAfter).filter((p) => fixedPortIds.has(p.id!)),
  ).toEqual(relativePins(fullBefore).filter((p) => fixedPortIds.has(p.id!)))
  const fullAnalysis = analyzeSchematicPlacement(fullAfter)
  expect(fullAnalysis.getIssues()).toEqual([])
  // The complete after fixture includes previously reviewed timing/capacitor corrections.
  expect(
    createIssueReproSnapshot({
      circuitJson: fullAfter,
      analysis: fullAnalysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      width: 1400,
      height: 850,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
