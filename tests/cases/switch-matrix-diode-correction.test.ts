import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createKeyboardSwitchDiodeRepro } from "../assets/keyboard-switch-series-diodes"
import { createSectionedSchematicSnapshot } from "../fixtures/create-sectioned-schematic-snapshot"
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
        "U5",
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
        "C_IN",
        "C_OUT",
        "C_BVIN",
        "C_BVOUT",
        "C_BVOUT2",
        "C_DEC",
        "C_LS",
        ...Array.from({ length: 12 }, (_, i) => `C_LED${i + 1}`),
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
  expect(baseline.getIssueCounts().DecouplingCapacitorsNotCloseTogether).toBe(3)
  expect(analysis.getIssues()).toEqual([])
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
  const issues = baseline.getIssues({
    issueTypes: ["SwitchMatrixDiodeSeparatedFromSwitch"],
  })
  const comparison = {
    before: { circuitJson: before, analysis: baseline },
    after: { circuitJson: after, analysis },
    issues,
    afterDiagnostic: (issue: (typeof issues)[number]) => {
      if (issue.lineItemType !== "SwitchMatrixDiodeSeparatedFromSwitch")
        throw new Error("Expected a switch/diode finding")
      return `${issue.switchSchematicBox.sourceComponentName} / ${issue.diodeSchematicBox.sourceComponentName}: no placement finding.\nDirect wire; original pin connections preserved.`
    },
    note: "Complete 92-component TSX circuit; unchanged electrical connections.\nFull analysis: 0 findings on the rearranged sheet.",
  }
  expect(() =>
    createPlacementComparisonSvg({
      ...comparison,
      after: comparison.before,
    }),
  ).toThrow("After layout still has 29 unresolved findings")
  const svg = createPlacementComparisonSvg(comparison)
  // Equal physical scale in both panels, even when the full render transforms differ.
  const pixelsPerUnit = [
    ...svg.matchAll(/<svg[^>]*data-real-to-screen-transform=[^>]*>/g),
  ].map(([root]) => {
    const scale = Math.abs(Number(root.match(/matrix\(([^, ]+)/)![1]))
    const viewBox = root
      .match(/viewBox="([^"]+)"/)![1]!
      .split(" ")
      .map(Number)
    return scale * Math.min(600 / viewBox[2]!, 360 / viewBox[3]!)
  })
  expect(pixelsPerUnit).toHaveLength(24)
  for (let i = 0; i < pixelsPerUnit.length; i += 2)
    expect(pixelsPerUnit[i]).toBeCloseTo(pixelsPerUnit[i + 1]!, 6)
  expect(svg).not.toContain('stroke="#2563eb"')
  expect(svg.match(/data-comparison-issue-number=/g)).toHaveLength(12)
  for (let number = 1; number <= 12; number++) {
    expect(
      svg.match(new RegExp(`data-issue-number="${number}"`, "g")),
    ).toHaveLength(2)
    expect(
      svg.match(new RegExp(`data-listing-issue-number="${number}"`, "g")),
    ).toHaveLength(1)
    expect(svg).toContain(`SW${number} / D${number}: no placement finding.`)
  }
  // Every crop reuses one of the two full-sheet drawings instead of embedding it again.
  expect(svg.match(/<g id="comparison-sheet-\d+">/g)).toHaveLength(2)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "comparison")
  const sections = [
    {
      title: "Battery input and charger",
      componentNames: [
        "J_BAT",
        "U3",
        "R_VPCC_H",
        "R_VPCC_L",
        "C_VUSB",
        "C_VBAT",
        "R_PROG1",
        "R_PROG3",
        "R_THERM",
      ],
    },
    {
      title: "Boost converter and VSYS capacitors",
      componentNames: ["U4", "L1", "R_FBH", "R_FBL", "C_VSYS", "C_BVIN"],
      padding: { left: 1, top: 1, right: 1.2 },
    },
    {
      title: "USB input and protection",
      componentNames: ["USBC", "R_CC1", "R_CC2", "U6"],
      padding: { left: 1 },
    },
    { title: "3.3 V regulator", componentNames: ["U2"] },
    {
      title: "Rotary encoder",
      componentNames: ["ENC1"],
      padding: { left: 3, right: 3, top: 1, bottom: 1 },
    },
    { title: "Microcontroller", componentNames: ["U1"] },
    { title: "Reset controls", componentNames: ["SW_RST", "R_EN", "C_EN"] },
    { title: "Boot controls", componentNames: ["SW_BOOT", "R_BOOT"] },
    {
      title: "3.3 V capacitor bank",
      componentNames: ["C_OUT", "C_BULK", "C_DEC"],
    },
    {
      title: "VBUS capacitor bank — first half",
      padding: { right: 0.45, top: 1, bottom: 1 },
      componentNames: [
        "C_BVOUT",
        "C_BVOUT2",
        "C_IN",
        "C_LS",
        "C_LED1",
        "C_LED2",
        "C_LED3",
        "C_LED4",
      ],
    },
    {
      title: "VBUS capacitor bank — second half",
      componentNames: Array.from({ length: 8 }, (_, i) => `C_LED${i + 5}`),
      padding: { left: 0.45, top: 1, bottom: 1 },
    },
    ...Array.from({ length: 6 }, (_, i) => {
      const first = i * 2 + 1
      return {
        title: `Keys ${first}–${first + 1}, diodes and RGB LEDs`,
        // Keep the adjacent keyboard row outside this viewport.
        padding: { top: 0.6, bottom: 0.6 },
        componentNames: [first, first + 1].flatMap((n) => [
          `SW${n}`,
          `D${n}`,
          `LED${n}`,
        ]),
      }
    }),
    {
      title: "LED data level shifter",
      componentNames: ["U5", "R_LED"],
      padding: { bottom: 0.5 },
    },
    {
      title: "Debug test points",
      componentNames: [
        "TP_GND1",
        "TP_GND2",
        "TP_VBAT",
        "TP_VUSB",
        "TP_5V",
        "TP_3V3",
        "TP_EN",
        "TP_LED",
      ],
    },
  ]
  const sectioned = createSectionedSchematicSnapshot({
    circuitJson: after,
    analysis,
    sections,
  })
  expect(sectioned.match(/data-schematic-section=/g)).toHaveLength(
    sections.length,
  )
  expect(sectioned).toContain("Complete sheet: 92 schematic components")
  expect(sectioned).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
