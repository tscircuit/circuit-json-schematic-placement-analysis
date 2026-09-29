import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createRelayFlybackDiodePlacement } from "../assets/relay-flyback-diode-placement"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("groups an identified relay flyback diode while excluding ambiguous or already readable loops", async () => {
  const before = await createRelayFlybackDiodePlacement()
  const after = await createRelayFlybackDiodePlacement(true)
  const issueTypes = ["FlybackDiodeSeparatedFromRelayCoil"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()
  expect(issues(before)).toMatchObject([
    {
      relaySchematicBox: { sourceComponentName: "K1" },
      diodeSchematicBox: { sourceComponentName: "D1" },
    },
  ])
  expect(issues(after)).toEqual([])
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  for (const name of ["K1", "Q1", "J1"])
    expect(getReproSchematicComponent(after, name)).toEqual(
      getReproSchematicComponent(before, name),
    )
  for (const [variant, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproRendered(json, 4)
    expectReproNets(json, [
      ["K1.COIL_A", "D1.anode", "Q1.collector"],
      ["K1.COIL_B", "D1.cathode", "J1.SUPPLY"],
      ["Q1.emitter", "net.GND"],
      ["Q1.base", "net.CONTROL"],
    ])
    expect(
      analyzeSchematicPlacement(json).getIssues({
        issueTypes: [...issueTypes],
      }),
    ).toEqual(issues(json))
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }

  const guards: Record<string, (json: CircuitJson) => void> = {
    "different sheet": (json) => {
      getReproSchematicComponent(json, "D1").schematic_sheet_id = "other"
    },
    "different schematic group": (json) => {
      getReproSchematicComponent(json, "D1").schematic_group_id = "other"
    },
    "different source scope": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.name === "D1")
          e.subcircuit_id = "other"
    },
    "unknown coil role": (json) => {
      const port = getReproSourcePort(json, "K1", "COIL_A")
      port.name = "pin1"
      port.port_hints = ["pin1"]
    },
    "ambiguous coil roles": (json) => {
      getReproSourcePort(json, "K1", "COIL_A").port_hints!.push("COIL_B")
    },
    "not a relay": (json) => {
      const port = getReproSourcePort(json, "K1", "COM")
      port.name = "pin3"
      port.port_hints = ["pin3"]
    },
    "reversed diode polarity": (json) => {
      const a = getReproSourcePort(json, "D1", "anode")
      const k = getReproSourcePort(json, "D1", "cathode")
      ;[a.name, k.name] = [k.name, a.name]
      ;[a.port_hints, k.port_hints] = [k.port_hints, a.port_hints]
    },
    "no grounded emitter": (json) => {
      for (const e of json) if (e.type === "source_net") e.is_ground = false
    },
    "unknown driver": (json) => {
      const port = getReproSourcePort(json, "Q1", "collector")
      port.name = "pin1"
      port.port_hints = ["pin1"]
    },
    "no label attached at diode pins": (json) => {
      for (let i = json.length - 1; i >= 0; i--)
        if (json[i]!.type === "schematic_net_label") json.splice(i, 1)
    },
    "deliberately remote block": (json) => {
      getReproSchematicComponent(json, "D1").center.y = 50
    },
    "duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "D1"),
        schematic_component_id: "duplicate",
      })
    },
    "missing coil pin": (json) => {
      const id = getReproSourcePort(json, "K1", "COIL_A").source_port_id
      const i = json.findIndex(
        (e) => e.type === "schematic_port" && e.source_port_id === id,
      )
      json.splice(i, 1)
    },
    "do-not-connect diode": (json) => {
      getReproSourcePort(json, "D1", "anode").do_not_connect = true
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
  // Parallel coils/diodes do not identify one local protection pair.
  for (const name of ["K1", "D1"]) {
    const json = structuredClone(before)
    const component = json.find(
      (e) => e.type === "source_component" && e.name === name,
    )!
    if (component.type !== "source_component") throw new Error("Missing part")
    json.push({ ...component, source_component_id: "parallel", name: "extra" })
    for (const e of before)
      if (
        e.type === "source_port" &&
        e.source_component_id === component.source_component_id
      )
        json.push({
          ...e,
          source_component_id: "parallel",
          source_port_id: `parallel_${e.source_port_id}`,
        })
    expect(issues(json), `parallel ${name}`).toEqual([])
  }
  // Match electrical roles and source traces, not reference names or caches.
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
