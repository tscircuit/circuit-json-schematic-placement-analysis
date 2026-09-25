import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createVoltageDividerPlacement } from "../assets/voltage-divider-placement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reports reversed divider halves while accepting conventional placement and excluding ambiguous networks", async () => {
  const before = await createVoltageDividerPlacement()
  const after = await createVoltageDividerPlacement(true)
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json).getIssues({
      issueTypes: ["VoltageDividerResistorsReversed"],
    })
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  for (const name of ["RBOT", "U1"])
    expect(getReproSchematicComponent(after, name)).toEqual(
      getReproSchematicComponent(before, name),
    )
  for (const [variant, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproRendered(json, 3)
    expectReproNets(json, [
      ["RTOP.pin1", "net.V12"],
      ["RTOP.pin2", "RBOT.pin1", "U1.ADC", "net.SENSE"],
      ["RBOT.pin2", "net.GND"],
    ])
    expect(
      analyzeSchematicPlacement(json, {
        issueTypes: ["VoltageDividerResistorsReversed"],
      }).getIssues(),
    ).toEqual(issues(json))
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        highlightIssues: ["VoltageDividerResistorsReversed"],
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }

  const guards: Record<string, (json: CircuitJson) => void> = {
    "small reversed offset": (json) => {
      getReproSchematicComponent(json, "RTOP").center.y = 1.8
    },
    "L-shaped divider": (json) => {
      const r = getReproSchematicComponent(json, "RTOP")
      for (const e of json)
        if (
          e.type === "schematic_port" &&
          e.schematic_component_id === r.schematic_component_id
        )
          e.facing_direction = e.facing_direction === "up" ? "left" : "right"
    },
    "different schematic group": (json) => {
      getReproSchematicComponent(json, "RTOP").schematic_group_id =
        "other-block"
    },
    "different source group": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "RTOP")
          e.source_group_id = "other-block"
    },
    "different sheet": (json) => {
      getReproSchematicComponent(json, "RTOP").schematic_sheet_id =
        "other-sheet"
    },
    "different subcircuit": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "RTOP")
          e.subcircuit_id = "other-subcircuit"
    },
    "unknown or negative supply": (json) => {
      for (const e of json)
        if (e.type === "source_net" && e.name === "V12")
          e.is_positive_voltage_source = false
    },
    "conflicting supply and ground": (json) => {
      for (const e of json)
        if (e.type === "source_net" && e.name === "V12") e.is_ground = true
    },
    "zero ohm link": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.ftype === "simple_resistor" &&
          e.name === "RTOP"
        )
          e.resistance = 0
    },
    "no connected tap load": (json) => {
      const id = getReproSourcePort(json, "U1", "ADC").source_port_id
      delete getReproSourcePort(json, "U1", "ADC")
        .subcircuit_connectivity_map_key
      for (const e of json)
        if (e.type === "source_trace")
          e.connected_source_port_ids = e.connected_source_port_ids.filter(
            (p) => p !== id,
          )
    },
    "additional resistor branch": (json) => {
      const source = json.find(
        (e) => e.type === "source_component" && e.name === "RTOP",
      )!
      if (source.type !== "source_component")
        throw new Error("Missing resistor")
      json.push({
        ...source,
        source_component_id: "extra-resistor",
        name: "RX",
      })
      json.push({
        ...getReproSourcePort(json, "RTOP", "pin2"),
        source_port_id: "extra-port",
        source_component_id: "extra-resistor",
      })
    },
    "ambiguous duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "RTOP"),
        schematic_component_id: "other-placement",
      })
    },
    "missing schematic pin": (json) => {
      const id = getReproSourcePort(json, "RTOP", "pin1").source_port_id
      const i = json.findIndex(
        (e) => e.type === "schematic_port" && e.source_port_id === id,
      )
      json.splice(i, 1)
    },
    "do-not-connect resistor": (json) => {
      getReproSourcePort(json, "RTOP", "pin1").do_not_connect = true
    },
    "shorted divider": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_port_ids: [
          getReproSourcePort(json, "RTOP", "pin1").source_port_id,
          getReproSourcePort(json, "RBOT", "pin1").source_port_id,
        ],
        connected_source_net_ids: [],
      })
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
  // Names and cached connectivity keys are not required: resolve source traces.
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
