import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import driver from "../assets/low-side-transistor-driver.circuit.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("places a grounded-emitter NPN below its load with collector up and emitter down", async () => {
  const original = structuredClone(driver.before) as CircuitJson
  const serialized = JSON.stringify(original)
  const analysis = analyzeSchematicPlacement(original)
  const issues = analysis
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "LowSideTransistorNotAlignedWithLoad",
    )
  expect(JSON.stringify(original)).toBe(serialized)
  expectReproRendered(original, 4)
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    transistorSchematicBox: { sourceComponentName: "Q1" },
    loadSchematicBox: { sourceComponentName: "BZ1" },
    baseResistorSchematicBox: { sourceComponentName: "R1" },
    clampDiodeSchematicBox: { sourceComponentName: "D1" },
    placementProblems: [
      "transistor_not_below_load",
      "collector_not_up",
      "emitter_not_down",
    ],
  })
  expect(analysis.getIssueCounts().LowSideTransistorNotAlignedWithLoad).toBe(1)
  expect(analysis.toString()).toContain('transistorName="Q1" loadName="BZ1"')
  const beforeSvg = createSchematicAnalysisFixtureSvg({
    circuitJson: original,
    analysis,
    highlightIssues: ["LowSideTransistorNotAlignedWithLoad"],
  })
  // Four component badges, plus a matching numbered badge in the listing.
  expect([...beforeSvg.matchAll(/class="issue-marker"/g)]).toHaveLength(4)
  expect(beforeSvg).toContain('data-listing-issue-number="1"')
  expect(beforeSvg).toMatchSvgSnapshot(import.meta.path, "before")

  const rotated = structuredClone(driver.after) as CircuitJson
  getReproSchematicComponent(rotated, "Q1").center.y = 3
  const rotatedOnly = analyzeSchematicPlacement(rotated)
    .getIssues()
    .find(
      (issue) => issue.lineItemType === "LowSideTransistorNotAlignedWithLoad",
    )
  expect(rotatedOnly?.placementProblems).toEqual(["transistor_not_below_load"])
  const moved = structuredClone(original)
  getReproSchematicComponent(moved, "Q1").center.y = -3
  const movedOnly = analyzeSchematicPlacement(moved)
    .getIssues()
    .find(
      (issue) => issue.lineItemType === "LowSideTransistorNotAlignedWithLoad",
    )
  expect(movedOnly?.placementProblems).toEqual([
    "collector_not_up",
    "emitter_not_down",
  ])

  const corrected = structuredClone(driver.after) as CircuitJson
  const correctedAnalysis = analyzeSchematicPlacement(corrected)
  expect(
    correctedAnalysis.getIssueCounts().LowSideTransistorNotAlignedWithLoad,
  ).toBe(0)
  const sourceRecords = (json: typeof original) =>
    json.filter(
      (e) => e.type.startsWith("source_") && !e.type.endsWith("_warning"),
    )
  expect(sourceRecords(corrected)).toEqual(sourceRecords(original))
  for (const circuitJson of [original, corrected]) {
    expectReproNets(circuitJson, [
      ["Q1.emitter", "net.GND"],
      ["Q1.collector", "BZ1.NEG", "D1.anode"],
      ["BZ1.POS", "D1.cathode", "net.VCC"],
      ["R1.pin2", "Q1.base"],
      ["R1.pin1", "net.INPUT"],
    ])
  }
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: corrected,
      analysis: correctedAnalysis,
      highlightIssues: ["LowSideTransistorNotAlignedWithLoad"],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "after")

  const driverIssues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, {
      issueTypes: ["LowSideTransistorNotAlignedWithLoad"],
    }).getIssues({ issueTypes: ["LowSideTransistorNotAlignedWithLoad"] })
  for (const misleadingHints of [false, true]) {
    for (const [json, expected] of [
      [original, 1],
      [corrected, 0],
    ] as const) {
      const renamed = structuredClone(json)
      for (const e of renamed) {
        if (e.type === "source_component") e.name = e.source_component_id
        if (e.type === "source_net") e.name = e.source_net_id
        if (e.type === "source_port") {
          e.name = e.source_port_id
          e.port_hints = misleadingHints
            ? ["base", "collector", "emitter", "anode", "cathode"]
            : []
        }
        if (e.type === "schematic_port") e.display_pin_label = "unrelated"
        if (
          e.type === "source_port" ||
          e.type === "source_net" ||
          e.type === "source_trace"
        )
          delete e.subcircuit_connectivity_map_key
      }
      const findings = driverIssues(renamed)
      expect(findings).toHaveLength(expected)
      if (expected) {
        expect(findings[0]).toMatchObject({
          collectorSourcePortId: issues[0]!.collectorSourcePortId,
          emitterSourcePortId: issues[0]!.emitterSourcePortId,
          placementProblems: issues[0]!.placementProblems,
        })
      }
    }
  }

  const guards: Record<string, (json: CircuitJson) => void> = {
    "missing transistor pin number": (json) => {
      delete getReproSourcePort(json, "Q1", "base").pin_number
    },
    "missing diode pin number": (json) => {
      delete getReproSourcePort(json, "D1", "anode").pin_number
    },
    "duplicate transistor pin number": (json) => {
      getReproSourcePort(json, "Q1", "base").pin_number = 1
    },
    "duplicate diode pin number": (json) => {
      getReproSourcePort(json, "D1", "cathode").pin_number = 1
    },
    "unsupported transistor pin numbering": (json) => {
      getReproSourcePort(json, "Q1", "base").pin_number = 4
    },
    "unconnectable transistor terminal": (json) => {
      getReproSourcePort(json, "Q1", "base").do_not_connect = true
    },
    "unconnectable diode terminal": (json) => {
      getReproSourcePort(json, "D1", "cathode").do_not_connect = true
    },
    "mismatched schematic pin numbering": (json) => {
      const id = getReproSourcePort(json, "Q1", "base").source_port_id
      const pin = json.find(
        (e) => e.type === "schematic_port" && e.source_port_id === id,
      )!
      if (pin.type === "schematic_port") pin.pin_number = 3
    },
    "duplicate schematic terminal": (json) => {
      const id = getReproSourcePort(json, "Q1", "base").source_port_id
      const pin = json.find(
        (e) => e.type === "schematic_port" && e.source_port_id === id,
      )!
      if (pin.type === "schematic_port")
        json.push({ ...pin, schematic_port_id: "duplicate-pin" })
    },
    "generic chip with transistor hints": (json) => {
      const component = json.find(
        (e) => e.type === "source_component" && e.ftype === "simple_transistor",
      )!
      Object.assign(component, { ftype: "simple_chip" })
    },
    "generic chip with diode hints": (json) => {
      const component = json.find(
        (e) => e.type === "source_component" && e.ftype === "simple_diode",
      )!
      Object.assign(component, { ftype: "simple_chip" })
    },
    "shorted base and emitter": (json) => {
      const component = json.find(
        (e) => e.type === "source_component" && e.ftype === "simple_transistor",
      )!
      if (component.type === "source_component")
        component.internally_connected_source_port_ids = [
          [
            getReproSourcePort(json, "Q1", "base").source_port_id,
            getReproSourcePort(json, "Q1", "emitter").source_port_id,
          ],
        ]
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(original)
    mutate(json)
    expect(driverIssues(json), name).toEqual([])
  }
})
