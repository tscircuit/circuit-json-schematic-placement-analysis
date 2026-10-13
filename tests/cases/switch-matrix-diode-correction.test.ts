import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createKeyboardSwitchDiodeRepro } from "../assets/keyboard-switch-series-diodes"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("grouping the matrix diodes clears all twelve findings and preserves the complete circuit", async () => {
  const before = await createKeyboardSwitchDiodeRepro()
  const after = await createKeyboardSwitchDiodeRepro(true)
  expectReproRendered(after, 92)
  // Compare electrical records; generated source warnings contain render-specific IDs.
  const electricalRecords = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_trace",
        "source_net",
        "source_group",
        "source_component_internal_connection",
      ].includes(e.type),
    )
  expect(electricalRecords(after)).toEqual(electricalRecords(before))
  for (const component of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(before, component.name!)
    const next = getReproSchematicComponent(after, component.name!)
    if (component.ftype === "simple_diode") {
      expect(next).toEqual({
        ...original,
        center: { x: original.center.x - 6, y: original.center.y + 3 },
        symbol_name: "diode_left",
      })
    } else if (
      ![
        "USBC",
        "U2",
        "R_CC1",
        "R_CC2",
        "R_VPCC_H",
        "R_VPCC_L",
        "R_PROG1",
        "R_PROG3",
        "R_THERM",
        "R_FBH",
        "R_FBL",
        "R_LED",
      ].includes(component.name!)
    ) {
      expect(next).toEqual(original)
    }
  }
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  expect(baseline.getIssueCounts().SwitchMatrixDiodeSeparatedFromSwitch).toBe(
    12,
  )
  expect(analysis.getIssueCounts().SwitchMatrixDiodeSeparatedFromSwitch).toBe(0)
  // Only the existing cross-block decoupling findings are deferred to a separate PR.
  // The complete circuit is analyzed; no solver is disabled for this comparison.
  expect(analysis.getIssues()).toHaveLength(3)
  expect(
    analysis
      .getIssues()
      .every(
        (issue) =>
          issue.lineItemType === "DecouplingCapacitorsNotCloseTogether",
      ),
  ).toBe(true)
  expect(
    analysis.getIssues().map((i) => analysis.schematicIssuesToString(i)),
  ).toEqual(
    baseline
      .getIssues()
      .filter((i) => i.lineItemType === "DecouplingCapacitorsNotCloseTogether")
      .map((i) => baseline.schematicIssuesToString(i)),
  )
  // Every private switch/diode connection must actually be drawn as a straight wire.
  for (let n = 1; n <= 12; n++) {
    const components = [`SW${n}`, `D${n}`].map((name) =>
      getReproSchematicComponent(after, name),
    )
    const endpoints = components.map((component, i) =>
      after.find(
        (e) =>
          e.type === "schematic_port" &&
          e.schematic_component_id === component.schematic_component_id &&
          e.pin_number === (i === 0 ? 1 : 2),
      ),
    )
    if (
      endpoints[0]?.type !== "schematic_port" ||
      endpoints[1]?.type !== "schematic_port"
    )
      throw new Error(`Missing switch/diode ports for pair ${n}`)
    const start = endpoints[0].center
    const end = endpoints[1].center
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y) < 1e-6
    expect(
      after.some(
        (e) =>
          e.type === "schematic_trace" &&
          e.edges.some(
            (edge) =>
              (near(edge.from, start) && near(edge.to, end)) ||
              (near(edge.from, end) && near(edge.to, start)),
          ),
      ),
    ).toBe(true)
  }
  const issue = baseline
    .getIssues()
    .find((i) => i.lineItemType === "SwitchMatrixDiodeSeparatedFromSwitch")!
  const comparison = {
    before: { circuitJson: before, analysis: baseline },
    after: { circuitJson: after, analysis },
    issue,
    afterDiagnostic:
      "SW1 / D1: no placement finding.\nAll 12 switch/diode pairs pass.",
    note: "Complete 92-component TSX circuit; unchanged electrical connections.\nFull analysis: only 3 unchanged decoupling-grouping findings remain (deferred to a separate PR).",
  }
  expect(() => createPlacementComparisonSvg(comparison)).toThrow(
    "After layout still has 3 unresolved findings",
  )
  const svg = createPlacementComparisonSvg({
    ...comparison,
    deferredIssueTypes: ["DecouplingCapacitorsNotCloseTogether"],
  })
  // Equal physical scale in both panels, even when the full render transforms differ.
  const pixelsPerUnit = [
    ...svg.matchAll(/<svg[^>]*data-real-to-screen-transform=[^>]*>/g),
  ].map(([root]) => {
    const scale = Math.abs(Number(root.match(/matrix\(([^, ]+)/)![1]))
    const viewBox = root
      .match(/viewBox="([^"]+)"/)![1]!
      .split(" ")
      .map(Number)
    return scale * Math.min(600 / viewBox[2]!, 540 / viewBox[3]!)
  })
  expect(pixelsPerUnit).toHaveLength(2)
  expect(pixelsPerUnit[0]).toBeCloseTo(pixelsPerUnit[1]!, 6)
  expect(svg).not.toContain('stroke="#2563eb"')
  expect(svg.match(/data-issue-number="1"/g)).toHaveLength(2)
  expect(svg.match(/data-listing-issue-number="1"/g)).toHaveLength(1)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "comparison")
})
