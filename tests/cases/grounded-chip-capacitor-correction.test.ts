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
import { createGameboyGroundedCapacitor } from "../assets/gameboy-grounded-capacitor"
const electrical = (j: CircuitJson) =>
  j.filter(
    (e) =>
      e.type.startsWith("source_") &&
      !e.type.endsWith("_warning") &&
      !e.type.endsWith("_error"),
  )
test("corrects grounded-chip-capacitor with unchanged electrical connections and chip pin layout", async () => {
  const before = await createGameboyGroundedCapacitor(),
    after = await createGameboyGroundedCapacitor(true)
  expectReproRendered(before, 2)
  expectReproRendered(after, 2)
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
    issues = analysis.getIssues({
      issueTypes: ["CapacitorSeparatedFromChipPins"],
    })
  expect(issues).toHaveLength(1)
  expect(corrected.getIssues()).toEqual([])
  const symbols = (j: CircuitJson) =>
    j.filter((e) => e.type === "schematic_component").map((e) => e.symbol_name)
  expect(symbols(after)).toEqual(symbols(before))
  expectDrawnWire(after, "U_SPK_AMP", "pin8", "C_AMP_VREF", "pin1")
  expect(
    createPlacementComparisonSvg({
      subject: "complete 2-component extract",
      centerEachPanel: true,
      panelHeight: 650,
      backgroundColor: "#f5f1ed",
      padding: { left: 3, right: 4, top: 1.2, bottom: 1.3 },
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: () =>
        "C_AMP_VREF: opposite the chip from its connected VREF pin.",
      afterDiagnostic:
        "Reference capacitor connects directly beside chip pin 8.\nComplete 2-component extract: 0 reported issues.",
      note: "Source component values and chip pin arrangement preserved; electrical connectivity verified.",
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
          height: 700,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 2-component extract.\nFull analysis: 0 reported issues.",
          1400,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-extract")
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
