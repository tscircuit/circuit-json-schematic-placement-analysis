import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createGameboySwitchCapacitorRepro } from "../assets/gameboy-switch-capacitors"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import { createSectionedSchematicSnapshot } from "../fixtures/create-sectioned-schematic-snapshot"
import {
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups all ten switch/capacitor branches with unchanged connections and zero full-sheet findings", async () => {
  const before = await createGameboySwitchCapacitorRepro()
  const after = await createGameboySwitchCapacitorRepro("grouped")
  expectReproRendered(after, 30)
  const records = (json: CircuitJson) =>
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
  const originals = records(before)
  const corrected = records(after)
  expect(originals).toHaveLength(163)
  expect(corrected).toHaveLength(originals.length)
  let rotatedAliases = 0
  for (const [i, original] of originals.entries()) {
    const part =
      original.type === "source_port"
        ? before.find(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === original.source_component_id,
          )
        : undefined
    if (
      original.type === "source_port" &&
      part?.type === "source_component" &&
      part.ftype === "simple_capacitor"
    ) {
      // Core drops the horizontal capacitor's generated pos/neg aliases when
      // rotated. Every other source field, including pin identity, must match.
      expect(original.port_hints).toContain(
        original.pin_number === 1 ? "pos" : "neg",
      )
      expect(corrected[i]).toEqual({
        ...original,
        port_hints: original.port_hints?.filter(
          (hint) => hint !== "pos" && hint !== "neg",
        ),
      })
      rotatedAliases++
    } else expect(corrected[i]).toEqual(original)
  }
  expect(rotatedAliases).toBe(20)
  const names: string[] = []
  for (let i = 0; i < 10; i++) {
    for (const [name, symbol] of [
      [`SW${i + 3}`, "push_button_normally_open_momentary_up"],
      [`C${i + 45}`, "capacitor_down"],
      [`R${i + 26}`, "boxresistor_down"],
    ] as const) {
      names.push(name)
      const a = getReproSchematicComponent(before, name)
      const b = getReproSchematicComponent(after, name)
      expect(b.symbol_name).toBe(symbol)
      expect(b.symbol_display_value).toBe(a.symbol_display_value)
    }
  }
  // Check the actual wire graph, not just net-label connectivity. Each signal
  // joins the switch, capacitor and resistor; each return joins switch and cap.
  const parent = new Map<string, string>()
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  const find = (p: string): string => {
    const next = parent.get(p)
    if (!next || next === p) return p
    const root = find(next)
    parent.set(p, root)
    return root
  }
  for (const e of after)
    if (e.type === "schematic_trace") {
      for (const edge of e.edges)
        parent.set(find(key(edge.from)), find(key(edge.to)))
    }
  const tip = (name: string, pin: string) => {
    const source = getReproSourcePort(after, name, pin)
    const port = after.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === source.source_port_id,
    )
    if (port?.type !== "schematic_port")
      throw new Error("Missing rendered port")
    return find(key(port.center))
  }
  for (let i = 0; i < 10; i++) {
    const signal = tip(`SW${i + 3}`, "pin2")
    const ground = tip(`SW${i + 3}`, "pin1")
    expect(tip(`C${i + 45}`, "pin1")).toBe(signal)
    expect(tip(`R${i + 26}`, "pin2")).toBe(signal)
    expect(tip(`C${i + 45}`, "pin2")).toBe(ground)
    expect(signal).not.toBe(ground)
  }
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  const issues = baseline.getIssues({
    issueTypes: ["SwitchCapacitorNotGrouped"],
  })
  expect(issues).toHaveLength(10)
  expect(baseline.getIssueCounts().TwoPinComponentShouldBeVertical).toBe(10)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createPlacementComparisonSvg({
      subject: "switch/capacitor grouping",
      before: { circuitJson: before, analysis: baseline },
      after: { circuitJson: after, analysis },
      issues,
      contextSourceComponentIds: before
        .filter((e) => e.type === "source_component")
        .map((e) => e.source_component_id),
      beforeDiagnostic: (issue) => {
        if (issue.lineItemType !== "SwitchCapacitorNotGrouped")
          throw new Error("Expected switch/capacitor issue")
        return `${issue.switchSchematicBox.sourceComponentName} / ${issue.capacitorSchematicBox.sourceComponentName}: parallel branches separated.`
      },
      afterDiagnostic:
        "Ten adjacent switch/capacitor branches, with pull resistors above.\nAll local signal and ground wires are continuous.\nFull-sheet analysis: 0 reported issues.",
      note: "All 30 components retained; same symbols and electrical connections.\nOriginal also has 10 capacitor-orientation findings, resolved in the corrected layout.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    createSectionedSchematicSnapshot({
      circuitJson: after,
      analysis,
      sections: [
        {
          title: "Complete controls sheet — ten switch/capacitor branches",
          componentNames: names,
        },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
