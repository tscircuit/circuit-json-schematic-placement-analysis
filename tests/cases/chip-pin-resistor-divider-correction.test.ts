import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { getSourceConnectivity } from "lib/utils/source-connectivity"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"
import { createBoostConverterDivider } from "../assets/boost-converter-divider"
const electrical = (json: CircuitJson) => {
  const connected = getSourceConnectivity(json)
  return {
    components: json.filter((e) => e.type === "source_component"),
    ports: json
      .filter((e) => e.type === "source_port")
      .map((p) => ({
        id: p.source_port_id,
        nets: json
          .filter(
            (n) =>
              n.type === "source_net" &&
              connected(n.source_net_id) === connected(p.source_port_id),
          )
          .map((n) => (n.type === "source_net" ? n.name : ""))
          .sort(),
        peers: json
          .filter(
            (q) =>
              q.type === "source_port" &&
              connected(q.source_port_id) === connected(p.source_port_id),
          )
          .map((q) => (q.type === "source_port" ? q.source_port_id : ""))
          .sort(),
      })),
  }
}
test("corrects the complete chip-pin-resistor-divider extract without changing connections", async () => {
  const before = await createBoostConverterDivider("before"),
    after = await createBoostConverterDivider("after")
  expectReproRendered(before, 3)
  expectReproRendered(after, 3)
  expect(electrical(after)).toEqual(electrical(before))
  const analysis = analyzeSchematicPlacement(before),
    corrected = analyzeSchematicPlacement(after),
    issues = analysis.getIssues({
      issueTypes: ["ResistorDividerSeparatedFromChip"],
    })
  expect(issues).toHaveLength(1)
  expect(corrected.getIssues()).toEqual([])
  const chip = (j: CircuitJson) => {
    const u = j.find((e) => e.type === "source_component" && e.name === "U1")!
    if (u.type !== "source_component") throw new Error("Missing chip")
    const body = j.find(
      (e) =>
        e.type === "schematic_component" &&
        e.source_component_id === u.source_component_id,
    )!
    return {
      body,
      pins: j.filter(
        (e) =>
          e.type === "schematic_port" &&
          e.schematic_component_id ===
            (body.type === "schematic_component"
              ? body.schematic_component_id
              : ""),
      ),
    }
  }
  expect(chip(after)).toEqual(chip(before))
  expectDrawnWire(after, "U1", "FB", "R1", "pin2")
  expectDrawnWire(after, "U1", "FB", "R2", "pin1")
  expect(
    createPlacementComparisonSvg({
      subject: "complete 3-component extract",
      centerEachPanel: true,
      panelHeight: 650,
      padding: { left: 0.9, right: 1.1, top: 0.9, bottom: 0.9 },
      backgroundColor: "#f5f1ed",
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "R1 / R2: divider is beyond the opposite chip edge; FB wraps around U1.",
      afterDiagnostic:
        "Divider beside the left-facing FB pin; the tap connection is direct.\nComplete extract: 0 reported issues.",
      note: "Real-board extract after existing rotation advice. Values, pin assignments and chip pin layout preserved.",
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
          height: 550,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 3-component extract.\nFull analysis of the extracted circuit: 0 reported issues.",
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
