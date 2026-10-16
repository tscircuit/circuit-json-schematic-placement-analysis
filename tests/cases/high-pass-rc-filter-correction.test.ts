import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { createMiniMp3Headphones } from "../assets/mini-mp3-headphones"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import { createCorrectedMiniMp3Headphones } from "../fixtures/mini-mp3-headphones-correction"
import {
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups both headphone high-pass RC pairs while preserving the complete 11-part block", async () => {
  const before = await createMiniMp3Headphones()
  const after = await createCorrectedMiniMp3Headphones()
  for (const json of [before, after]) expectReproRendered(json, 11)
  const electrical = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_group",
        "source_bus",
        "source_component_internal_connection",
      ].includes(e.type),
    )
  expect(electrical(after)).toEqual(electrical(before))
  // Explicit ground labels duplicate existing trace connections and renumber trace IDs.
  const traceConnections = (json: CircuitJson) =>
    [
      ...new Set(
        json
          .filter((e) => e.type === "source_trace")
          .map((e) =>
            JSON.stringify([
              e.connected_source_port_ids.toSorted(),
              e.connected_source_net_ids.toSorted(),
            ]),
          ),
      ),
    ].toSorted()
  expect(traceConnections(after)).toEqual(traceConnections(before))
  const beforeNet = getSourceConnectivity(before)
  const afterNet = getSourceConnectivity(after)
  const ports = before.filter((e) => e.type === "source_port")
  expect(ports).toHaveLength(24)
  for (const a of ports)
    for (const b of ports)
      expect(afterNet(a.source_port_id) === afterNet(b.source_port_id)).toBe(
        beforeNet(a.source_port_id) === beforeNet(b.source_port_id),
      )

  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  const issues = baseline
    .getIssues()
    .filter((i) => i.lineItemType === "HighPassRcFilterComponentsNotGrouped")
  expect(issues).toHaveLength(2)
  expect(baseline.getIssues()).toHaveLength(3)
  expect(analysis.getIssues()).toEqual([])
  const rotations: Record<string, number> = {
    C44: 180,
    R18: -90,
    R19: -90,
    R20: -90,
  }
  for (const source of before.filter((e) => e.type === "source_component")) {
    const b = getReproSchematicComponent(before, source.name!)
    const a = getReproSchematicComponent(after, source.name!)
    const degrees = rotations[source.name!] ?? 0
    expect(a.symbol_name).toBe(
      degrees === 180
        ? "capacitor_polarized_left"
        : degrees === -90
          ? "boxresistor_down"
          : b.symbol_name,
    )
    const radians = (degrees * Math.PI) / 180
    for (const pin of before.filter(
      (e) =>
        e.type === "schematic_port" &&
        e.schematic_component_id === b.schematic_component_id,
    )) {
      if (pin.type !== "schematic_port") continue
      const other = after.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === pin.source_port_id,
      )
      if (other?.type !== "schematic_port")
        throw new Error("Missing corrected port")
      expect(other.pin_number).toBe(pin.pin_number)
      const dx = pin.center.x - b.center.x,
        dy = pin.center.y - b.center.y
      expect(other.center.x - a.center.x).toBeCloseTo(
        dx * Math.cos(radians) - dy * Math.sin(radians),
        6,
      )
      expect(other.center.y - a.center.y).toBeCloseTo(
        dx * Math.sin(radians) + dy * Math.cos(radians),
        6,
      )
    }
  }

  // Both capacitor/resistor joins must be visible continuous wires, not just matching labels.
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  const pin = (name: string, number: string) => {
    const source = getReproSourcePort(after, name, number)
    const p = after.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === source.source_port_id,
    )
    if (p?.type !== "schematic_port") throw new Error("Missing drawn pin")
    return p.center
  }
  for (const [c, r] of [
    ["C43", "R25"],
    ["C44", "R26"],
  ] as const) {
    const net = getReproSourcePort(
      after,
      c,
      "pin2",
    ).subcircuit_connectivity_map_key
    expect(net).toBeString()
    const edges = after.flatMap((e) =>
      e.type === "schematic_trace" && e.subcircuit_connectivity_map_key === net
        ? e.edges
        : [],
    )
    const start = pin(c, "pin2"),
      end = pin(r, "pin1")
    const vertices = [start, end, ...edges.flatMap((e) => [e.from, e.to])]
    const segments = edges.map((e) =>
      vertices
        .filter(
          (p) =>
            Math.abs(
              (p.x - e.from.x) * (e.to.y - e.from.y) -
                (p.y - e.from.y) * (e.to.x - e.from.x),
            ) < 1e-6 &&
            p.x >= Math.min(e.from.x, e.to.x) - 1e-6 &&
            p.x <= Math.max(e.from.x, e.to.x) + 1e-6 &&
            p.y >= Math.min(e.from.y, e.to.y) - 1e-6 &&
            p.y <= Math.max(e.from.y, e.to.y) + 1e-6,
        )
        .map(key),
    )
    const reached = new Set([key(start)])
    let previous = -1
    while (previous !== reached.size) {
      previous = reached.size
      for (const segment of segments)
        if (segment.some((p) => reached.has(p)))
          for (const p of segment) reached.add(p)
    }
    expect(reached.has(key(end))).toBe(true)
  }
  const comparison = createPlacementComparisonSvg({
    subject: "complete headphone block",
    before: { circuitJson: before, analysis: baseline },
    after: { circuitJson: after, analysis },
    issues,
    contextSourceComponentIds: before.flatMap((e) =>
      e.type === "source_component" ? [e.source_component_id] : [],
    ),
    beforeDiagnostic: (issue) => {
      if (issue.lineItemType !== "HighPassRcFilterComponentsNotGrouped")
        throw new Error("Unexpected finding")
      return `${issue.capacitorSchematicBox.sourceComponentName} / ${issue.resistorSchematicBox.sourceComponentName}: series capacitor separated from grounded resistor.`
    },
    afterDiagnostic:
      "Both grounded resistors join their capacitors with continuous wires.\nComplete 11-component block: 0 reported issues.",
    note: "Same scale, symbols and pin connections. C44 also rotated to fix the existing flip finding; the three other RC branches are aligned below.",
  })
  expect(comparison.match(/data-issue-number=/g)).toHaveLength(4)
  expect(comparison).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: after,
          analysis,
          showFullSchematic: true,
          showOverlay: false,
          width: 1200,
          height: 900,
        }).svg,
        createAnalyzerTextSvg(
          "Complete headphone block: all 11 components retained.\nFull analysis: 0 reported issues.",
          1200,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
