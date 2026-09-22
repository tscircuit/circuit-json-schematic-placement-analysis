import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import driver from "../assets/low-side-transistor-driver.circuit.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("skips ambiguous transistor roles, rails, loads and circuits in separate blocks", async () => {
  const original = structuredClone(driver.before) as CircuitJson
  const mutations: Array<(json: CircuitJson) => void> = [
    (json) => {
      const q = json.find(
        (e) => e.type === "source_component" && e.name === "Q1",
      )!
      if (q.type === "source_component" && q.ftype === "simple_transistor")
        q.transistor_type = "pnp"
    },
    (json) => {
      for (const role of ["base", "collector", "emitter"]) {
        const port = getReproSourcePort(json, "Q1", role)
        port.port_hints = [port.name]
      }
    },
    (json) => {
      getReproSourcePort(json, "Q1", "collector").port_hints!.push("base")
    },
    (json) => {
      const net = json.find((e) => e.type === "source_net" && e.name === "VCC")!
      if (net.type === "source_net") net.is_positive_voltage_source = false
    },
    (json) => {
      const net = json.find((e) => e.type === "source_net" && e.name === "GND")!
      if (net.type === "source_net") net.is_power = true
    },
    (json) => {
      const load = json.find(
        (e) => e.type === "source_component" && e.name === "BZ1",
      )!
      if (load.type === "source_component")
        Object.assign(load, { ftype: "simple_resistor", resistance: 1000 })
    },
    (json) => {
      const anode = getReproSourcePort(json, "D1", "anode")
      const cathode = getReproSourcePort(json, "D1", "cathode")
      anode.port_hints = ["cathode"]
      cathode.port_hints = ["anode"]
      anode.name = "pin1"
      cathode.name = "pin2"
    },
    (json) => {
      getReproSchematicComponent(json, "BZ1").schematic_sheet_id = "other-sheet"
    },
    (json) => {
      getReproSchematicComponent(json, "R1").schematic_group_id = "other-block"
    },
    (json) => {
      const q = getReproSchematicComponent(json, "Q1")
      json.push({ ...q, schematic_component_id: "second-transistor-unit" })
    },
    (json) => {
      const peer = structuredClone(getReproSourcePort(json, "Q1", "collector"))
      peer.source_port_id = "another-active-device"
      peer.source_component_id = "another-transistor"
      json.push(peer)
    },
  ]
  const noClamp = original.filter(
    (e) =>
      !(
        e.type === "source_port" &&
        e.source_component_id ===
          getReproSourcePort(original, "D1", "anode").source_component_id
      ),
  )
  expect(
    analyzeSchematicPlacement(noClamp).getIssueCounts()
      .LowSideTransistorNotAlignedWithLoad,
  ).toBe(0)
  for (const mutate of mutations) {
    const json = structuredClone(original)
    mutate(json)
    expect(
      analyzeSchematicPlacement(json).getIssueCounts()
        .LowSideTransistorNotAlignedWithLoad,
    ).toBe(0)
  }
  // Connectivity must also work without cached keys (using source traces), and
  // never depend on a load's name or on a particular package pin numbering.
  const renamed = structuredClone(original)
  for (const e of renamed) {
    if (e.type === "source_component")
      e.name = `renamed_${e.source_component_id}`
    if (
      e.type === "source_port" ||
      e.type === "source_net" ||
      e.type === "source_trace"
    )
      delete e.subcircuit_connectivity_map_key
    if (e.type === "source_port") e.pin_number = (e.pin_number ?? 0) + 10
  }
  expect(
    analyzeSchematicPlacement(renamed).getIssueCounts()
      .LowSideTransistorNotAlignedWithLoad,
  ).toBe(1)
  const unknownPins = structuredClone(original)
  mutations[1]!(unknownPins)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: unknownPins,
      highlightIssues: ["LowSideTransistorNotAlignedWithLoad"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
