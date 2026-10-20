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
import { createTrackerTransistorResistor } from "../assets/tracker-transistor-resistor"
const electrical = (j: CircuitJson) =>
  j.filter(
    (e) =>
      e.type.startsWith("source_") &&
      !e.type.endsWith("_warning") &&
      !e.type.endsWith("_error"),
  )
test("corrects complete transistor network with unchanged connectivity and no remaining findings", async () => {
  const before = await createTrackerTransistorResistor(),
    after = await createTrackerTransistorResistor("after")
  expectReproRendered(before, 3)
  expectReproRendered(after, 3)
  expect(electrical(after)).toEqual(electrical(before))
  const analysis = analyzeSchematicPlacement(before),
    corrected = analyzeSchematicPlacement(after)
  expect(corrected.getIssues()).toEqual([])
  const issues = analysis.getIssues({
    issueTypes: ["TransistorResistorNotAligned"],
  })
  expect(issues).toHaveLength(1)
  expectDrawnWire(after, "R12", "pin2", "Q1", "base")
  expectDrawnWire(after, "R13", "pin1", "Q1", "collector")
  const resistorPin = getReproSourcePort(after, "R12", "pin2")
  const transistorPin = getReproSourcePort(after, "Q1", "base")
  const center = (id: string) => {
    const p = after.find(
      (e) => e.type === "schematic_port" && e.source_port_id === id,
    )
    if (p?.type !== "schematic_port") throw new Error("Missing port")
    return p.center
  }
  expect(center(resistorPin.source_port_id).y).toBeCloseTo(
    center(transistorPin.source_port_id).y,
  )
  const intermediate = analyzeSchematicPlacement(
    await createTrackerTransistorResistor("orientation-only"),
  )
  expect(intermediate.getIssues().map((i) => i.lineItemType)).toEqual([
    "TransistorResistorNotAligned",
  ])

  expect(
    createPlacementComparisonSvg({
      subject: "complete transistor network",
      backgroundColor: "#f5f1ed",
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "R12 / Q1: separated connected terminals point in different directions.",
      afterDiagnostic:
        "R12 feeds Q1 along a straight wire; R13 and ground read vertically.\nComplete three-part network: 0 reported issues.",
      note: "Tracker PWRKEY extract. All component values and pin connections are preserved. The existing R13 rail-orientation finding is also corrected.",
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
