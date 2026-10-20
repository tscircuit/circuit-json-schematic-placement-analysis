import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createPocketAudioDividerCapacitors } from "../assets/pocket-audio-divider-capacitors"
// Warning messages contain runtime instance IDs; port hint order changes on rotation.
// Compare every electrical record, treating the hint aliases as an unordered set.
const electrical = (j: CircuitJson) =>
  j
    .filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
        "source_group",
        "source_bus",
        "source_component_internal_connection",
      ].includes(e.type),
    )
    .map((e) =>
      e.type === "source_port"
        ? { ...e, port_hints: e.port_hints?.toSorted() }
        : e,
    )
test("corrects resistor-divider-capacitor placement with unchanged connectivity and no remaining findings", async () => {
  const before = await createPocketAudioDividerCapacitors(),
    after = await createPocketAudioDividerCapacitors(true)
  expectReproRendered(before, 6)
  expectReproRendered(after, 6)
  expect(electrical(after)).toEqual(electrical(before))
  expect(analyzeSchematicPlacement(after).getIssues()).toEqual([])
  for (const channel of ["L", "R"] as const) {
    expectDrawnWire(
      after,
      `R_ATT_${channel}1`,
      "pin2",
      `C_AMP_${channel}`,
      "pin1",
    )
    expectDrawnWire(
      after,
      `R_ATT_${channel}2`,
      "pin1",
      `C_AMP_${channel}`,
      "pin1",
    )
    expect(
      getReproSchematicComponent(after, `R_ATT_${channel}1`).symbol_name,
    ).toBe(getReproSchematicComponent(before, `R_ATT_${channel}1`).symbol_name)
    const a = await createPocketAudioDividerCapacitors(false, false, channel),
      b = await createPocketAudioDividerCapacitors(true, false, channel),
      analysis = analyzeSchematicPlacement(a)
    expect(electrical(b)).toEqual(electrical(a))
    expect(analyzeSchematicPlacement(b).getIssues()).toEqual([])
    expect(
      createPlacementComparisonSvg({
        subject: `complete ${channel} input network`,
        backgroundColor: "#f5f1ed",
        before: { circuitJson: a, analysis },
        after: { circuitJson: b, analysis: analyzeSchematicPlacement(b) },
        issues: analysis.getIssues(),
        contextSourceComponentIds: a.flatMap((e) =>
          e.type === "source_component" ? [e.source_component_id] : [],
        ),
        beforeDiagnostic: (i) =>
          i.lineItemType === "CapacitorSeparatedFromResistorDivider"
            ? `C_AMP_${channel}: separated from its two-resistor divider tap.`
            : `R_ATT_${channel}2: ground-connected resistor is horizontal.`,
        afterDiagnostic:
          "The capacitor and divider now form a compact, visibly connected network.\nFull analysis of this channel: 0 reported issues.",
        note: "One complete input network from pocket-audio-player. Both channels are tested; electrical connections and native component symbols are preserved.",
      }),
    ).toMatchSvgSnapshot(
      import.meta.path,
      `comparison-${channel.toLowerCase()}`,
    )
  }
  const orientationOnly = analyzeSchematicPlacement(
    await createPocketAudioDividerCapacitors(false, true),
  )
  expect(orientationOnly.getIssues().map((i) => i.lineItemType)).toEqual([
    "CapacitorSeparatedFromResistorDivider",
    "CapacitorSeparatedFromResistorDivider",
  ])
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: after,
          analysis: analyzeSchematicPlacement(after),
          showFullSchematic: true,
          showOverlay: false,
          width: 1400,
          height: 600,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 6-component stereo input network.\nFull analysis of the extracted network: 0 reported issues.",
          1400,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-network")
})
// Check visible trace continuity too: equal electrical nets alone can be joined only by labels.
function expectDrawnWire(
  json: CircuitJson,
  a: string,
  ap: string,
  b: string,
  bp: string,
) {
  const first = getReproSourcePort(json, a, ap),
    second = getReproSourcePort(json, b, bp)
  const pin = (id: string) => {
    const p = json.find(
      (e) => e.type === "schematic_port" && e.source_port_id === id,
    )
    if (p?.type !== "schematic_port") throw new Error("Missing drawn port")
    return p.center
  }
  const start = pin(first.source_port_id),
    end = pin(second.source_port_id)
  const edges = json.flatMap((e) =>
    e.type === "schematic_trace" &&
    e.subcircuit_connectivity_map_key === first.subcircuit_connectivity_map_key
      ? e.edges
      : [],
  )
  const vertices = [start, end, ...edges.flatMap((e) => [e.from, e.to])]
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
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
