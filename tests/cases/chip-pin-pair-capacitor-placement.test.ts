import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createChipPinPairCapacitorPlacement } from "../assets/chip-pin-pair-capacitor-placement"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("places a capacitor beside its connected chip pins without relying on names", async () => {
  const issueTypes = ["CapacitorSeparatedFromChipPins"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes }).getIssues()
  const before = await createChipPinPairCapacitorPlacement()
  const after = await createChipPinPairCapacitorPlacement({ nearPins: true })
  expect(issues(before)).toMatchObject([
    {
      hostSchematicBox: { sourceComponentName: "U1" },
      capacitorSchematicBox: { sourceComponentName: "C1" },
    },
  ])
  expect(issues(after)).toEqual([])
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  for (const [variant, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const original = JSON.stringify(json)
    expectReproRendered(json, 2)
    expectReproNets(json, [
      ["U1.pin2", "C1.pin1"],
      ["U1.pin1", "C1.pin2"],
    ])
    const analysis = analyzeSchematicPlacement(json)
    expect(analysis.getIssues({ issueTypes })).toEqual(issues(json))
    expect(analysis.getIssueCounts().CapacitorSeparatedFromChipPins).toBe(
      variant === "before" ? 1 : 0,
    )
    expect(
      analysis.getIssues({ issueTypes, schematicSheetId: "other" }),
    ).toEqual([])
    const svg = createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      issueTypes,
      showFullSchematic: true,
      showOverlay: true,
      showListingIssueMarkers: true,
      width: 1200,
      height: 700,
    })
    expect([...svg.matchAll(/data-issue-number="(\d+)"/g)]).toHaveLength(
      variant === "before" ? 2 : 0,
    )
    expect([
      ...svg.matchAll(/data-listing-issue-number="(\d+)"/g),
    ]).toHaveLength(variant === "before" ? 1 : 0)
    expect(svg).toMatchSvgSnapshot(import.meta.path, variant)
    expect(JSON.stringify(json)).toBe(original)
  }
  for (const options of [
    { mirrored: true },
    { rotation: 90 },
    { rotation: 180 },
    { rotation: 270 },
  ]) {
    expect(
      issues(await createChipPinPairCapacitorPlacement(options)),
    ).toHaveLength(1)
    expect(
      issues(
        await createChipPinPairCapacitorPlacement({
          ...options,
          nearPins: true,
        }),
      ),
    ).toEqual([])
  }
  // Permit offsets and short connections without requiring exact alignment.
  for (const capacitorPosition of [
    { x: -3, y: 1 },
    { x: -5, y: 5 },
    { x: 1.8, y: 0 },
  ])
    expect(
      issues(await createChipPinPairCapacitorPlacement({ capacitorPosition })),
    ).toEqual([])

  // The same geometry must be detected for arbitrary pin names.
  for (const pinNames of [
    ["CPL", "CPH"],
    ["BOOT", "SW"],
    ["X17", "Y42"],
  ] as const)
    expect(
      issues(await createChipPinPairCapacitorPlacement({ pinNames })),
    ).toHaveLength(1)

  // Power/ground classification comes from attributes, even for anonymous pins.
  for (const attributes of [
    { requiresPower: true },
    { providesPower: true },
    { requiresGround: true },
    { providesGround: true },
    { requiresVoltage: 3.3 },
    { providesVoltage: 3.3 },
  ]) {
    const json = await createChipPinPairCapacitorPlacement({
      pinAttributes: { pin2: attributes },
    })
    expect(issues(json)).toEqual([])
  }
  for (const options of [{ differentChips: true }, { sharedConnection: true }])
    expect(issues(await createChipPinPairCapacitorPlacement(options))).toEqual(
      [],
    )

  const guards: Record<string, (json: CircuitJson) => void> = {
    "separate sheet": (json) => {
      getReproSchematicComponent(json, "C1").schematic_sheet_id = "other"
    },
    "separate block": (json) => {
      getReproSchematicComponent(json, "C1").schematic_group_id = "other"
    },
    "duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "C1"),
        schematic_component_id: "duplicate",
      })
    },
    "unconnected capacitor": (json) => {
      getReproSourcePort(json, "C1", "pin1").do_not_connect = true
    },
    "unconnected host": (json) => {
      getReproSourcePort(json, "U1", "pin2").do_not_connect = true
    },
    "missing geometry": (json) => {
      const id = getReproSourcePort(json, "U1", "pin2").source_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    },
    "different pin sides": (json) => {
      const id = getReproSourcePort(json, "U1", "pin2").source_port_id
      for (const e of json)
        if (e.type === "schematic_port" && e.source_port_id === id)
          e.facing_direction = "right"
    },
    "grounded capacitor": (json) => {
      const p = getReproSourcePort(json, "C1", "pin2")
      json.push({
        type: "source_net",
        source_net_id: "ground",
        name: "GND",
        is_ground: true,
        member_source_group_ids: [],
        subcircuit_connectivity_map_key: p.subcircuit_connectivity_map_key,
      })
    },
    "power net with an arbitrary name": (json) => {
      const p = getReproSourcePort(json, "C1", "pin1")
      json.push({
        type: "source_net",
        source_net_id: "supply",
        name: "arbitrary_label",
        is_power: true,
        member_source_group_ids: [],
        subcircuit_connectivity_map_key: p.subcircuit_connectivity_map_key,
      })
    },
    "zero capacitance": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.ftype === "simple_capacitor")
          e.capacitance = 0
    },
    "shared net": (json) => {
      json.push({
        ...getReproSourcePort(json, "U1", "pin2"),
        source_port_id: "extra",
        name: "EXTRA",
        port_hints: ["EXTRA"],
      })
    },
    "shorted chip pins": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_net_ids: [],
        connected_source_port_ids: [
          getReproSourcePort(json, "U1", "pin2").source_port_id,
          getReproSourcePort(json, "U1", "pin1").source_port_id,
        ],
      })
    },
    "DNP capacitor": (json) => {
      json.push({
        type: "pcb_component",
        pcb_component_id: "optional",
        source_component_id: getReproSchematicComponent(json, "C1")
          .source_component_id!,
        center: { x: 0, y: 0 },
        width: 1,
        height: 1,
        layer: "top",
        rotation: 0,
        do_not_place: true,
        obstructs_within_bounds: true,
      })
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
  const uncached = structuredClone(before)
  for (const e of uncached) {
    if (e.type === "source_component") e.name = `part_${e.source_component_id}`
    if (e.type === "source_port") {
      e.name = ""
      e.port_hints = []
    }
    if (e.type === "source_net") e.name = `net_${e.source_net_id}`
    if (
      e.type === "source_port" ||
      e.type === "source_trace" ||
      e.type === "source_net"
    )
      delete e.subcircuit_connectivity_map_key
  }
  expect(issues(uncached)).toHaveLength(1)
})
