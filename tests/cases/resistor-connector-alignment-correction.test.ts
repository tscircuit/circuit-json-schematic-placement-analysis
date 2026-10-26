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
import { createProgrammerResistorConnector } from "../assets/programmer-resistor-connector"

const electrical = (json: CircuitJson) =>
  json.filter(
    (e) =>
      e.type.startsWith("source_") &&
      !e.type.endsWith("_warning") &&
      !e.type.endsWith("_error"),
  )

test("corrects the complete programmer-resistor-connector extract without changing electrical connections", async () => {
  const before = await createProgrammerResistorConnector(),
    after = await createProgrammerResistorConnector(true)
  expectReproRendered(before, 3)
  expectReproRendered(after, 3)
  expect(electrical(after)).toEqual(electrical(before))
  const analysis = analyzeSchematicPlacement(before),
    corrected = analyzeSchematicPlacement(after)
  const issues = analysis.getIssues({
    issueTypes: ["ResistorConnectorNotAligned"],
  })
  expect(issues).toHaveLength(2)
  expect(corrected.getIssues()).toEqual([])
  expectDrawnWire(after, "R_UART_TX", "pin2", "J5", "pin1")
  expectDrawnWire(after, "R_UART_RX", "pin2", "J5", "pin3")
  expect(
    createPlacementComparisonSvg({
      subject: "complete UART connection",
      centerEachPanel: true,
      panelHeight: 520,
      padding: { right: 2, left: 1.5, top: 1, bottom: 1 },
      backgroundColor: "#f5f1ed",
      before: { circuitJson: before, analysis },
      after: { circuitJson: after, analysis: corrected },
      issues,
      contextSourceComponentIds: before.flatMap((e) =>
        e.type === "source_component" ? [e.source_component_id] : [],
      ),
      beforeDiagnostic: (issue) =>
        issue.lineItemType === "ResistorConnectorNotAligned"
          ? `${issue.resistorSchematicBox.sourceComponentName} / J5: resistor is behind its connected connector pin.`
          : issue.lineItemType,
      afterDiagnostic:
        "UART resistors face their connector pins along straight wires.\nComplete 3-component extract: 0 reported issues.",
      note: "Programmer UART extract. Connector symbol, pin order, resistor values and pin connections are preserved.",
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
