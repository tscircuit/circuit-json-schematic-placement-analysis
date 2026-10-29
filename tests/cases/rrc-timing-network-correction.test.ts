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
} from "../fixtures/placement-repro-assertions"
import { create555TimingNetwork } from "../assets/555-timing-network"
const electrical = (j: CircuitJson) =>
  j
    .filter(
      (e) =>
        e.type.startsWith("source_") &&
        !e.type.endsWith("_warning") &&
        !e.type.endsWith("_error"),
    )
    .map((e) =>
      e.type === "source_port"
        ? { ...e, port_hints: [...(e.port_hints ?? [])].sort() }
        : e,
    )
test("corrects rrc-timing-network with unchanged electrical connections and chip pin layout", async () => {
  const before = await create555TimingNetwork(),
    after = await create555TimingNetwork(false, true)
  expectReproRendered(before, 7)
  expectReproRendered(after, 7)
  expect(electrical(after)).toEqual(electrical(before))
  const chips = (j: CircuitJson) =>
    j.filter(
      (e) =>
        e.type === "schematic_component" &&
        j.some(
          (c) =>
            c.type === "source_component" &&
            c.ftype === "simple_chip" &&
            c.source_component_id === e.source_component_id,
        ),
    )
  expect(chips(after)).toEqual(chips(before))
  const chipIds = new Set(
    chips(before).map((e) =>
      e.type === "schematic_component" ? e.schematic_component_id : "",
    ),
  )
  const pins = (j: CircuitJson) =>
    j
      .filter(
        (e) =>
          e.type === "schematic_port" &&
          chipIds.has(e.schematic_component_id ?? ""),
      )
      .map((e) => {
        if (e.type !== "schematic_port") throw new Error("Expected pin")
        const { is_connected, ...geometry } = e
        return geometry
      })
  expect(pins(after)).toEqual(pins(before))
  const analysis = analyzeSchematicPlacement(before),
    corrected = analyzeSchematicPlacement(after),
    issues = analysis.getIssues({ issueTypes: ["RrcTimingNetworkNotGrouped"] })
  expect(issues).toHaveLength(1)
  expect(corrected.getIssues()).toEqual([])
  expectDrawnWire(after, "R1", "pin2", "R2", "pin1")
  expectDrawnWire(after, "R2", "pin2", "C1", "pin1")
  expectDrawnWire(after, "U1", "pin7", "R1", "pin2")
  expectDrawnWire(after, "U1", "pin6", "C1", "pin1")
  expectDrawnWire(after, "U1", "pin5", "C2", "pin1")
  expect(
    createPlacementComparisonSvg({
      subject: "complete 555 timing circuit",
      centerEachPanel: true,
      panelHeight: 900,
      backgroundColor: "#f5f1ed",
      padding: { left: 1.4, right: 1.5, top: 1.2, bottom: 1.3 },
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "R1 / R2 / C1: timing chain is spread around the chip.",
      afterDiagnostic:
        "R1–R2–C1 form a compact chain beside the timing pins.\nComplete 7-component circuit: 0 reported issues.",
      note: "Before has 4 orientation findings, 1 capacitor-placement finding, 1 connector-detour finding and the marked grouping finding. After has 0 total findings.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: after,
          analysis: corrected,
          showFullSchematic: true,
          showOverlay: false,
          width: 1400,
          height: 850,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 7-component circuit.\nFull analysis: 0 reported issues.",
          1400,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  const rotated = await create555TimingNetwork(true),
    rotatedAnalysis = analyzeSchematicPlacement(rotated)
  expect(rotatedAnalysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "RrcTimingNetworkNotGrouped",
    "CapacitorSeparatedFromChipPins",
  ])
  expect(
    createPlacementComparisonSvg({
      subject: "orientation-only vs grouped",
      centerEachPanel: true,
      panelHeight: 900,
      backgroundColor: "#f5f1ed",
      before: { circuitJson: rotated, analysis: rotatedAnalysis },
      after: { circuitJson: after, analysis: corrected },
      issues: rotatedAnalysis.getIssues(),
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: (issue) =>
        issue.lineItemType === "CapacitorSeparatedFromChipPins"
          ? "C2 is across the chip from its connected pin 5."
          : "Existing orientation findings fixed; the timing chain is still spread out.",
      afterDiagnostic:
        "Compact connected timing chain.\nComplete circuit: 0 reported issues.",
      note: "Grouping is independent of the existing two-pin orientation findings.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "orientation-only-comparison")
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
