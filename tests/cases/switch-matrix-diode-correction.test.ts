import { beforeAll, expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createKeyboardSwitchDiodeRepro } from "../assets/keyboard-switch-series-diodes"
import { createSectionedSchematicSnapshot } from "../fixtures/create-sectioned-schematic-snapshot"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

let before: CircuitJson

beforeAll(async () => {
  before = await createKeyboardSwitchDiodeRepro()
})

test("grouping the matrix diodes clears all twelve findings and preserves the complete circuit", async () => {
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
        center: {
          x: original.center.x - 6,
          y:
            original.center.y +
            3 +
            Math.floor((Number(component.name!.slice(1)) - 1) / 4) * 5,
        },
        symbol_name: "diode_left",
      })
    } else if (
      Array.from({ length: 12 }, (_, i) => `SW${i + 1}`).includes(
        component.name!,
      )
    ) {
      const row = Math.floor((Number(component.name!.slice(2)) - 1) / 4)
      expect(next).toEqual({
        ...original,
        center: { x: original.center.x, y: 14 - row * 4 },
      })
    } else if (component.ftype === "simple_led") {
      const row = Math.floor((Number(component.name!.slice(3)) - 1) / 4)
      // Move only the original RGB symbol; do not replace it with a custom chip.
      expect(next).toEqual({
        ...original,
        center: { x: original.center.x, y: 3 - row * 3 },
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
    contextSourceComponentIds: [
      "U5",
      "R_LED",
      "TP_EN",
      "TP_LED",
      "TP_5V",
      "TP_3V3",
      "TP_VBAT",
      "TP_VUSB",
      "TP_GND1",
      "TP_GND2",
      ...Array.from({ length: 12 }, (_, i) => `LED${i + 1}`),
    ].map(
      (name) => getReproSchematicComponent(before, name).source_component_id!,
    ),
    beforeDiagnostic: (issue: (typeof issues)[number]) => {
      if (issue.lineItemType !== "SwitchMatrixDiodeSeparatedFromSwitch")
        throw new Error("Expected a switch/diode finding")
      return `${issue.switchSchematicBox.sourceComponentName} / ${issue.diodeSchematicBox.sourceComponentName}: diode separated from switch.`
    },
    afterDiagnostic:
      "All 12 diodes are beside their switches.\nCompact 3 × 4 matrix; unchanged RGB symbols below it.\nAll 12 switch/diode connections are continuous straight wires.\nOriginal pin connections preserved; full analysis reports 0 findings.",
    note: "Complete 92-component TSX circuit; unchanged electrical connections.\nFull analysis: 0 findings on the rearranged sheet.",
  }
  expect(() =>
    createPlacementComparisonSvg({
      ...comparison,
      after: comparison.before,
    }),
  ).toThrow("After layout still has 30 unresolved findings")
  const svg = createPlacementComparisonSvg(comparison)
  // Both panels must show the whole matrix at the same scale and world coordinates.
  const panels = [
    ...svg.matchAll(/<svg[^>]*data-real-to-screen-transform=[^>]*>/g),
  ].map(([root]) => {
    const [a, , , d, tx, ty] = root
      .match(/matrix\(([^)]+)\)/)![1]!
      .split(/[\s,]+/)
      .map(Number) as [number, number, number, number, number, number]
    const viewBox = root
      .match(/viewBox="([^"]+)"/)![1]!
      .split(" ")
      .map(Number)
    const width = Number(root.match(/\bwidth="([\d.]+)"/)![1])
    const height = Number(root.match(/\bheight="([\d.]+)"/)![1])
    return {
      pixelsPerUnit: a * Math.min(width / viewBox[2]!, height / viewBox[3]!),
      left: (viewBox[0]! - tx) / a,
      right: (viewBox[0]! + viewBox[2]! - tx) / a,
      bottom: (viewBox[1]! + viewBox[3]! - ty) / d,
      top: (viewBox[1]! - ty) / d,
    }
  })
  expect(panels).toHaveLength(2)
  for (const key of [
    "pixelsPerUnit",
    "left",
    "right",
    "bottom",
    "top",
  ] as const)
    expect(panels[0]![key]).toBeCloseTo(panels[1]![key], 6)
  for (const [index, circuitJson] of [before, after].entries()) {
    const panel = panels[index]!
    for (const component of circuitJson) {
      if (
        component.type !== "schematic_component" ||
        !comparison.contextSourceComponentIds.includes(
          component.source_component_id!,
        )
      )
        continue
      expect(
        component.center.x - component.size.width / 2,
      ).toBeGreaterThanOrEqual(panel.left)
      expect(component.center.x + component.size.width / 2).toBeLessThanOrEqual(
        panel.right,
      )
      expect(
        component.center.y - component.size.height / 2,
      ).toBeGreaterThanOrEqual(panel.bottom)
      expect(
        component.center.y + component.size.height / 2,
      ).toBeLessThanOrEqual(panel.top)
    }
  }
  expect(svg).not.toContain('stroke="#2563eb"')
  expect(svg.match(/data-comparison-panel=/g)).toHaveLength(2)
  for (let number = 1; number <= 12; number++) {
    for (const [index, circuitJson] of [before, after].entries()) {
      const panel = panels[index]!
      for (const name of [`SW${number}`, `D${number}`]) {
        const component = getReproSchematicComponent(circuitJson, name)
        expect(
          component.center.x - component.size.width / 2 >= panel.left &&
            component.center.x + component.size.width / 2 <= panel.right &&
            component.center.y - component.size.height / 2 >= panel.bottom &&
            component.center.y + component.size.height / 2 <= panel.top,
        ).toBe(true)
      }
    }
    expect(
      svg.match(new RegExp(`data-issue-number="${number}"`, "g")),
    ).toHaveLength(2)
    expect(
      svg.match(new RegExp(`data-listing-issue-number="${number}"`, "g")),
    ).toHaveLength(1)
    expect(svg).toContain(
      `SW${number} / D${number}: diode separated from switch.`,
    )
  }
  expect(svg).toMatchSvgSnapshot(import.meta.path, "comparison")
  const sections = [
    {
      title: "Power, USB and rotary encoder",
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
        "U4",
        "L1",
        "R_FBH",
        "R_FBL",
        "C_VSYS",
        "C_BVIN",
        "USBC",
        "R_CC1",
        "R_CC2",
        "U6",
        "ENC1",
        "C_BVOUT",
        "C_BVOUT2",
        "C_IN",
        "C_LS",
        ...Array.from({ length: 12 }, (_, i) => `C_LED${i + 1}`),
      ],
    },
    {
      title: "3.3 V regulator and microcontroller",
      componentNames: [
        "U2",
        "U1",
        "SW_RST",
        "R_EN",
        "C_EN",
        "SW_BOOT",
        "R_BOOT",
        "C_OUT",
        "C_BULK",
        "C_DEC",
      ],
    },
    {
      title: "Complete switch / diode matrix, RGB LEDs and test points",
      componentNames: [
        ...Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) => [
          `SW${n}`,
          `D${n}`,
          `LED${n}`,
        ]),
        "U5",
        "R_LED",
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
  expect(sectioned).toContain("Full-sheet analysis: 0 reported issues.")
  expect(sectioned).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
