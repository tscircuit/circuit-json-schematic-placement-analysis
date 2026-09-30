import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import amplifier from "../assets/common-emitter-amplifier-placement.circuit.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("recognizes an AC-coupled common-emitter stage and accepts a vertical current path", () => {
  const before = structuredClone(amplifier.before) as CircuitJson
  const after = structuredClone(amplifier.after) as CircuitJson
  const issueTypes = ["CommonEmitterAmplifierNotArrangedVertically"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()
  expect(issues(before)).toMatchObject([
    {
      transistorSchematicBox: { sourceComponentName: "Q1" },
      collectorResistorSchematicBox: { sourceComponentName: "RC" },
      emitterResistorSchematicBox: { sourceComponentName: "RE" },
      placementProblems: [
        "collector_not_up",
        "emitter_not_down",
        "emitter_resistor_not_below",
      ],
    },
  ])
  expect(issues(after)).toEqual([])
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  for (const name of ["RB", "C_IN", "C_OUT"])
    expect(getReproSchematicComponent(after, name)).toEqual(
      getReproSchematicComponent(before, name),
    )
  for (const [variant, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproRendered(json, 6)
    const analysis = analyzeSchematicPlacement(json)
    expect(analysis.getIssues({ issueTypes })).toEqual(issues(json))
    expect(
      analysis.getIssueCounts().CommonEmitterAmplifierNotArrangedVertically,
    ).toBe(variant === "before" ? 1 : 0)
    expect(
      analysis.getIssues({ issueTypes, schematicSheetId: "other" }),
    ).toEqual([])
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        analysis: analyzeSchematicPlacement(json, {
          issueTypes: [...issueTypes],
        }),
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }
  expect(issues(amplifier.dividerBefore as CircuitJson)).toHaveLength(1)
  expect(issues(amplifier.dividerAfter as CircuitJson)).toEqual([])

  // Correcting only the resistors does not correct the transistor orientation.
  const resistorsOnly = structuredClone(before)
  for (const name of ["RC", "RE"]) {
    const target = getReproSchematicComponent(resistorsOnly, name)
    const replacement = getReproSchematicComponent(after, name)
    Object.assign(target, replacement)
    for (const port of resistorsOnly)
      if (
        port.type === "schematic_port" &&
        port.schematic_component_id === target.schematic_component_id
      )
        Object.assign(
          port,
          after.find(
            (e) =>
              e.type === "schematic_port" &&
              e.source_port_id === port.source_port_id,
          ),
        )
  }
  expect(issues(resistorsOnly)).toMatchObject([
    { placementProblems: ["collector_not_up", "emitter_not_down"] },
  ])
  const misplacedCollector = structuredClone(after)
  getReproSchematicComponent(misplacedCollector, "RC").center.y = -1
  expect(issues(misplacedCollector)).toMatchObject([
    { placementProblems: ["collector_resistor_not_above"] },
  ])
  // This is an ordering advisory, not an exact-coordinate alignment check.
  const offset = structuredClone(after)
  getReproSchematicComponent(offset, "RC").center.x += 0.6
  getReproSchematicComponent(offset, "RE").center.x -= 0.4
  expect(issues(offset)).toEqual([])

  const guards: Record<string, (json: CircuitJson) => void> = {
    "different sheet": (json) => {
      getReproSchematicComponent(json, "RE").schematic_sheet_id = "other"
    },
    "separate group": (json) => {
      getReproSchematicComponent(json, "RC").schematic_group_id = "other"
    },
    "unknown transistor roles": (json) => {
      const p = getReproSourcePort(json, "Q1", "base")
      p.name = "pin"
      p.port_hints = []
    },
    "ambiguous roles": (json) => {
      getReproSourcePort(json, "Q1", "collector").port_hints!.push("emitter")
    },
    "do not connect": (json) => {
      getReproSourcePort(json, "RE", "pin1").do_not_connect = true
    },
    "duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "Q1"),
        schematic_component_id: "duplicate",
      })
    },
    "unknown supply polarity": (json) => {
      for (const e of json)
        if (e.type === "source_net") e.is_positive_voltage_source = false
    },
    "PNP stage": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.ftype === "simple_transistor")
          e.transistor_type = "pnp"
    },
    "zero-ohm emitter connection": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.ftype === "simple_resistor" &&
          e.name === "RE"
        )
          e.resistance = 0
    },
    "collector and emitter roles swapped": (json) => {
      const c = getReproSourcePort(json, "Q1", "collector"),
        e = getReproSourcePort(json, "Q1", "emitter")
      ;[c.name, e.name] = [e.name, c.name]
      ;[c.port_hints, e.port_hints] = [e.port_hints, c.port_hints]
    },
    "shared collector": (json) => {
      json.push({
        ...getReproSourcePort(json, "Q1", "collector"),
        source_component_id: "other",
        source_port_id: "other_collector",
      })
    },
    "bypassed emitter": (json) => {
      json.push({
        ...getReproSourcePort(json, "RE", "pin1"),
        source_component_id: "bypass",
        source_port_id: "bypass_emitter",
      })
    },
    "output coupling missing": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.ftype === "simple_capacitor" &&
          e.name === "C_OUT"
        )
          e.capacitance = 0
    },
    "input coupling missing": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.ftype === "simple_capacitor" &&
          e.name === "C_IN"
        )
          e.capacitance = 0
    },
    "missing pin geometry": (json) => {
      const id = getReproSourcePort(json, "Q1", "emitter").source_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
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
})
