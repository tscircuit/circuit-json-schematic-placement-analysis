import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { createUsbSeriesResistorPair } from "../assets/usb-series-resistor-pair"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("recognizes separated USB series pairs and accepts nearby offset paths without changing connectivity", async () => {
  const before = await createUsbSeriesResistorPair()
  const after = await createUsbSeriesResistorPair(true)
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json).getIssues({
      issueTypes: ["UsbSeriesResistorsNotAligned"],
    })
  expect(issues(before)).toHaveLength(1) // Both ends recognize the pair: report once.
  // Readable USB paths do not require the resistors to share an exact axis.
  expect(getReproSchematicComponent(after, "RP").center.x).not.toBe(
    getReproSchematicComponent(after, "RN").center.x,
  )
  expect(issues(after)).toEqual([])
  const sources = (json: CircuitJson) =>
    json.filter(
      (e) => e.type.startsWith("source_") && !e.type.endsWith("_warning"),
    )
  expect(sources(after)).toEqual(sources(before))
  for (const [name, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    expectReproRendered(json, 4)
    expectReproNets(json, [
      ["U1.USB_DP", "RP.pin1"],
      ["U1.USB_DM", "RN.pin1"],
      ["J1.DP", "RP.pin2"],
      ["J1.DM", "RN.pin2"],
    ])
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        highlightIssues: ["UsbSeriesResistorsNotAligned"],
      }).replace(/[ \t]+$/gm, ""),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
  // The existing real controller already has adjacent parallel USB resistors.
  expect(issues(getRp2040BldcSheet("controller"))).toEqual([])

  // Topology/identity guards use source data; visual geometry guards use ports.
  const guards: Record<string, (json: CircuitJson) => void> = {
    "unknown signal roles": (json) => {
      for (const component of ["U1", "J1"]) {
        for (const pin of ["pin1", "pin2"]) {
          const port = getReproSourcePort(json, component, pin)
          port.name = pin
          port.port_hints = [pin]
        }
      }
    },
    "ambiguous USB port aliases": (json) => {
      getReproSourcePort(json, "U1", "USB_DP").port_hints!.push("USB_DM")
      getReproSourcePort(json, "J1", "DP").port_hints!.push("D-")
    },
    "separate sheets": (json) => {
      getReproSchematicComponent(json, "RN").schematic_sheet_id = "other-sheet"
    },
    "separate groups": (json) => {
      getReproSchematicComponent(json, "RN").schematic_group_id = "other-block"
    },
    "ambiguous placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "RN"),
        schematic_component_id: "second-unit",
      })
    },
    "overlapping resistor bodies": (json) => {
      getReproSchematicComponent(json, "RN").center.x = -3
    },
    "different signal axes": (json) => {
      const id = getReproSchematicComponent(json, "RN").schematic_component_id
      for (const e of json) {
        if (e.type === "schematic_port" && e.schematic_component_id === id) {
          e.facing_direction = e.facing_direction === "left" ? "up" : "down"
        }
      }
    },
    "disconnected interface": (json) => {
      const peer = getReproSourcePort(json, "J1", "DM")
      peer.source_component_id = "different-interface"
    },
    "shorted pair": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_port_ids: [
          getReproSourcePort(json, "U1", "USB_DP").source_port_id,
          getReproSourcePort(json, "U1", "USB_DM").source_port_id,
        ],
        connected_source_net_ids: [],
      })
    },
    "grounded branch": (json) => {
      const port = getReproSourcePort(json, "RN", "pin1")
      json.push({
        type: "source_net",
        source_net_id: "ground",
        name: "GND",
        is_ground: true,
        member_source_group_ids: [],
      })
      json.push({
        type: "source_trace",
        source_trace_id: "ground-branch",
        connected_source_port_ids: [port.source_port_id],
        connected_source_net_ids: ["ground"],
      })
    },
    "extra resistor on branch": (json) => {
      const source = json.find(
        (e) => e.type === "source_component" && e.name === "RN",
      )!
      json.push({
        ...source,
        source_component_id: "extra-resistor",
      } as CircuitJson[number])
      json.push({
        ...getReproSourcePort(json, "RN", "pin1"),
        source_port_id: "extra-port",
        source_component_id: "extra-resistor",
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
    if (e.type === "source_component")
      e.name = `renamed_${e.source_component_id}`
    if (
      e.type === "source_port" ||
      e.type === "source_net" ||
      e.type === "source_trace"
    )
      delete e.subcircuit_connectivity_map_key
  }
  expect(issues(renamed)).toHaveLength(1)

  // Rotating the complete geometry preserves the rule, with columns replacing rows.
  const vertical = structuredClone(before)
  for (const e of vertical) {
    if (e.type === "schematic_component" || e.type === "schematic_port") {
      e.center = { x: -e.center.y, y: e.center.x }
      if (e.type === "schematic_component")
        [e.size.width, e.size.height] = [e.size.height, e.size.width]
      else
        e.facing_direction = (
          { left: "down", right: "up", up: "left", down: "right" } as const
        )[e.facing_direction!]
    }
  }
  expect(issues(vertical)).toMatchObject([{ signalAxis: "vertical" }])
})
