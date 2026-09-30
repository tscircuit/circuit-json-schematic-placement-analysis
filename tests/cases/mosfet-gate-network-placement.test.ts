import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createMosfetGateNetworkPlacement } from "../assets/mosfet-gate-network-placement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups MOSFET gate resistors without guessing roles or requiring exact alignment", async () => {
  const before = await createMosfetGateNetworkPlacement()
  const after = await createMosfetGateNetworkPlacement({ grouped: true })
  const issueTypes = ["MosfetGateNetworkNotGrouped"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()
  expect(issues(before)).toMatchObject([
    {
      mosfetSchematicBox: { sourceComponentName: "Q1" },
      seriesGateResistorSchematicBox: { sourceComponentName: "R_GATE" },
      gateSourceResistorSchematicBox: { sourceComponentName: "R_BIAS" },
    },
  ])
  expect(issues(after)).toEqual([])
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  expect(getReproSchematicComponent(after, "Q1")).toEqual(
    getReproSchematicComponent(before, "Q1"),
  )
  for (const [variant, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproRendered(json, 3)
    expectReproNets(json, [
      ["Q1.G", "R_GATE.pin2", "R_BIAS.pin1"],
      ["Q1.S", "R_BIAS.pin2", "net.GND"],
      ["R_GATE.pin1", "net.DRIVE"],
      ["Q1.D", "net.LOAD"],
    ])
    const analysis = analyzeSchematicPlacement(json)
    expect(analysis.getIssues({ issueTypes })).toEqual(issues(json))
    expect(analysis.getIssueCounts().MosfetGateNetworkNotGrouped).toBe(
      variant === "before" ? 1 : 0,
    )
    expect(
      analysis.getIssues({ issueTypes, schematicSheetId: "other" }),
    ).toEqual([])
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }
  // Ground is not required: high-side bias returns to the floating source.
  for (const options of [{ floating: true }, { native: true }]) {
    expect(
      issues(await createMosfetGateNetworkPlacement(options)),
    ).toHaveLength(1)
    expect(
      issues(
        await createMosfetGateNetworkPlacement({ ...options, grouped: true }),
      ),
    ).toEqual([])
  }
  const guards: Record<string, (json: CircuitJson) => void> = {
    "different sheet": (json) => {
      getReproSchematicComponent(json, "R_GATE").schematic_sheet_id = "other"
    },
    "separate schematic group": (json) => {
      getReproSchematicComponent(json, "R_BIAS").schematic_group_id = "other"
    },
    "unknown gate role": (json) => {
      const p = getReproSourcePort(json, "Q1", "G")
      p.name = "pin1"
      p.port_hints = ["pin1"]
    },
    "ambiguous role": (json) => {
      getReproSourcePort(json, "Q1", "G").port_hints!.push("S")
    },
    "do not connect": (json) => {
      getReproSourcePort(json, "R_BIAS", "pin1").do_not_connect = true
    },
    "duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "Q1"),
        schematic_component_id: "duplicate",
      })
    },
    "missing gate geometry": (json) => {
      const id = getReproSourcePort(json, "Q1", "G").source_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    },
    "zero-ohm series part": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.name === "R_GATE" &&
          e.ftype === "simple_resistor"
        )
          e.resistance = 0
    },
    "wrong return topology": (json) => {
      const s = getReproSourcePort(json, "Q1", "S"),
        d = getReproSourcePort(json, "Q1", "D")
      ;[s.name, d.name] = [d.name, s.name]
      ;[s.port_hints, d.port_hints] = [d.port_hints, s.port_hints]
    },
    "shared gate": (json) => {
      const p = getReproSourcePort(json, "Q1", "G")
      json.push({
        ...p,
        source_component_id: "other",
        source_port_id: "other_gate",
      })
    },
    "additional gate branch": (json) => {
      const p = getReproSourcePort(json, "R_BIAS", "pin1")
      json.push({
        ...p,
        source_component_id: "extra",
        source_port_id: "extra_branch",
      })
    },
    "separate source scope": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "R_BIAS")
          e.subcircuit_id = "other"
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
  // Leave room for ordinary local driver/label spacing, even without alignment.
  const local = structuredClone(before)
  getReproSchematicComponent(local, "R_GATE").center = { x: -2.5, y: 0.7 }
  getReproSchematicComponent(local, "R_BIAS").center = { x: -1, y: -1.4 }
  expect(issues(local)).toEqual([])
  // Unbonded source pins are not one unambiguous MOSFET source node.
  const unbonded = structuredClone(before)
  const source = getReproSourcePort(unbonded, "Q1", "S")
  unbonded.push({
    ...source,
    name: "S2",
    port_hints: ["S2"],
    source_port_id: "unbonded-source",
    subcircuit_connectivity_map_key: undefined,
  })
  expect(issues(unbonded)).toEqual([])
  // Renaming parts and removing cached net keys must not change recognition.
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = `part_${e.source_component_id}`
    if (
      e.type === "source_port" ||
      e.type === "source_net" ||
      e.type === "source_trace"
    )
      delete e.subcircuit_connectivity_map_key
  }
  expect(issues(renamed)).toHaveLength(1)
  // Readable nearby alternatives need neither exact coordinates nor fixed orientation.
  const nearby = structuredClone(after)
  getReproSchematicComponent(nearby, "R_GATE").center.y += 0.7
  getReproSchematicComponent(nearby, "R_BIAS").center.x += 0.5
  expect(issues(nearby)).toEqual([])
})
