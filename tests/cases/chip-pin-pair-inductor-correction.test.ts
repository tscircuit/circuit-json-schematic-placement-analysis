import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createRemoteChipPinInductor } from "../assets/remote-chip-pin-inductor"

test("corrects the chip / inductor pair without changing electrical connections or chip pin layout", async () => {
  const electrical = (json: CircuitJson) =>
    json.filter((e) => e.type.startsWith("source_"))
  const before = await createRemoteChipPinInductor(false, "pair")
  const after = await createRemoteChipPinInductor(true, "pair")
  const completeBefore = await createRemoteChipPinInductor(false, "full")
  const completeAfter = await createRemoteChipPinInductor(true, "full")
  for (const [a, b, count] of [
    [before, after, 2],
    [completeBefore, completeAfter, 7],
  ] as const) {
    expectReproRendered(a, count)
    expectReproRendered(b, count)
    expect(electrical(b)).toEqual(electrical(a))
    expect(
      analyzeSchematicPlacement(a)
        .getIssues()
        .map((i) => i.lineItemType),
    ).toEqual(
      count === 7
        ? ["InductorSeparatedFromChipPins", "ResistorDividerSeparatedFromChip"]
        : ["InductorSeparatedFromChipPins"],
    )
    expect(analyzeSchematicPlacement(b).getIssues()).toEqual([])
    for (const [n, p, m, q] of [
      ["U2", "pin9", "L1", "pin1"],
      ["U2", "pin7", "L1", "pin2"],
    ] as const)
      expectDrawnWire(b, n, p, m, q)
    const rotations: Record<string, number> = { L1: -90 }
    for (const component of a.filter((e) => e.type === "source_component")) {
      const first = getReproSchematicComponent(a, component.name!)
      const second = getReproSchematicComponent(b, component.name!)
      const angle = ((rotations[component.name!] ?? 0) * Math.PI) / 180
      if (!angle) expect(second.symbol_name).toBe(first.symbol_name)
      for (const pin of a.filter(
        (e) =>
          e.type === "schematic_port" &&
          e.schematic_component_id === first.schematic_component_id,
      )) {
        if (pin.type !== "schematic_port") continue
        const other = b.find(
          (e) =>
            e.type === "schematic_port" &&
            e.source_port_id === pin.source_port_id,
        )
        if (other?.type !== "schematic_port")
          throw new Error("Missing corrected port")
        expect(other.pin_number).toBe(pin.pin_number)
        const dx = pin.center.x - first.center.x,
          dy = pin.center.y - first.center.y
        expect(other.center.x - second.center.x).toBeCloseTo(
          dx * Math.cos(angle) - dy * Math.sin(angle),
          6,
        )
        expect(other.center.y - second.center.y).toBeCloseTo(
          dx * Math.sin(angle) + dy * Math.cos(angle),
          6,
        )
      }
    }
  }
  const baseline = analyzeSchematicPlacement(before),
    analysis = analyzeSchematicPlacement(after)
  const comparison = createPlacementComparisonSvg({
    backgroundColor: "#f5f1ed",
    subject: "chip / inductor pair",
    before: { circuitJson: before, analysis: baseline },
    after: { circuitJson: after, analysis },
    issues: baseline.getIssues(),
    contextSourceComponentIds: before.flatMap((e) =>
      e.type === "source_component" ? [e.source_component_id] : [],
    ),
    beforeDiagnostic: () =>
      "L1 sits above U2, away from its two connected pins on the right.",
    afterDiagnostic:
      "L1 is beside both connected chip pins, with two visible wires.\nFull analysis of the pair: 0 reported issues.",
    note: "Focused U2 / L1 extract; other chip boundary connections are omitted equally in both panels. The complete regulator sheet is verified separately.",
  })
  expect(comparison.match(/data-issue-number=/g)).toHaveLength(2)
  expect(comparison).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: completeAfter,
          analysis: analyzeSchematicPlacement(completeAfter),
          showFullSchematic: true,
          showOverlay: false,
          width: 1200,
          height: 1000,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 7-component regulator section.\nFull analysis: 0 reported issues.",
          1200,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-section")
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
