import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createRegulatorCapacitorPlacement } from "../assets/regulator-capacitor-placement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("reports reversed regulator capacitors while accepting offset correct-side placement and excluding ambiguous networks", async () => {
  const before = await createRegulatorCapacitorPlacement()
  const after = await createRegulatorCapacitorPlacement(true)
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json).getIssues({
      issueTypes: ["RegulatorCapacitorsOnWrongSides"],
    })
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  expect(getReproSchematicComponent(after, "U1")).toEqual(
    getReproSchematicComponent(before, "U1"),
  )
  for (const [name, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproNets(json, [
      ["U1.IN", "CIN.pin1", "net.V5"],
      ["U1.OUT", "COUT.pin1", "net.V3V3"],
      ["U1.GND", "CIN.pin2", "COUT.pin2", "net.GND"],
    ])
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        highlightIssues: ["RegulatorCapacitorsOnWrongSides"],
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
    expect(JSON.stringify(json)).toBe(original)
  }
  const guards: Record<string, (json: CircuitJson) => void> = {
    "unknown input": (json) => {
      const p = getReproSourcePort(json, "U1", "IN")
      p.name = "pin1"
      p.port_hints = ["pin1"]
    },
    "conflicting input/output aliases": (json) => {
      getReproSourcePort(json, "U1", "IN").port_hints!.push("OUT")
    },
    "signal chip instead of regulator": (json) => {
      const p = getReproSourcePort(json, "U1", "EN")
      p.name = "DATA"
      p.port_hints = ["DATA"]
    },
    "unknown output supply": (json) => {
      for (const e of json)
        if (e.type === "source_net" && e.name === "V3V3") {
          e.is_power = false
          e.is_positive_voltage_source = false
        }
    },
    "shorted input/output": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_port_ids: [
          getReproSourcePort(json, "U1", "IN").source_port_id,
          getReproSourcePort(json, "U1", "OUT").source_port_id,
        ],
        connected_source_net_ids: [],
      })
    },
    "separate group": (json) => {
      getReproSchematicComponent(json, "CIN").schematic_group_id = "other-block"
    },
    "separate sheet": (json) => {
      getReproSchematicComponent(json, "CIN").schematic_sheet_id = "other-sheet"
    },
    "distant capacitor bank": (json) => {
      getReproSchematicComponent(json, "CIN").center.x = 30
    },
    "overlapping bodies": (json) => {
      getReproSchematicComponent(json, "CIN").center.x = 0.1
    },
    "only one reversed capacitor": (json) => {
      getReproSchematicComponent(json, "CIN").center.x = -4.2
    },
    "ambiguous placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "CIN"),
        schematic_component_id: "duplicate-placement",
      })
    },
    "additional local input capacitor": (json) => {
      const cap = getReproSchematicComponent(json, "CIN")
      const id = cap.source_component_id
      for (const e of [...json]) {
        if (e.type === "source_component" && e.source_component_id === id)
          json.push({ ...e, source_component_id: "extra-cap", name: "CX" })
        if (e.type === "source_port" && e.source_component_id === id) {
          const portId = `extra-${e.source_port_id}`
          json.push({
            ...e,
            source_port_id: portId,
            source_component_id: "extra-cap",
          })
          json.push({
            type: "source_trace",
            source_trace_id: `join-${portId}`,
            connected_source_port_ids: [portId, e.source_port_id],
            connected_source_net_ids: [],
          })
        }
        if (
          e.type === "schematic_port" &&
          e.schematic_component_id === cap.schematic_component_id
        )
          json.push({
            ...e,
            schematic_port_id: `extra-${e.schematic_port_id}`,
            source_port_id: `extra-${e.source_port_id}`,
            schematic_component_id: "extra-cap-placement",
          })
      }
      json.push({
        ...cap,
        source_component_id: "extra-cap",
        schematic_component_id: "extra-cap-placement",
        center: { x: 3, y: -2 },
      })
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
  // Rotate the whole geometry; the rule follows actual port sides in every direction.
  let rotated = structuredClone(before)
  for (let turn = 0; turn < 3; turn++) {
    for (const e of rotated)
      if (e.type === "schematic_component" || e.type === "schematic_port") {
        e.center = { x: -e.center.y, y: e.center.x }
        if (e.type === "schematic_component")
          [e.size.width, e.size.height] = [e.size.height, e.size.width]
        else
          e.facing_direction = (
            { left: "down", right: "up", up: "left", down: "right" } as const
          )[e.facing_direction!]
      }
    expect(issues(rotated)).toHaveLength(1)
  }
})
