import { expect, test } from "bun:test"
import type { CircuitJson, SchematicText, SourcePort } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createLocalPassiveNetLabelFixture,
  getLocalPassivePins,
} from "../assets/local-passive-net-label"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

const textTraceId = (text: SchematicText) =>
  "source_trace_id" in text && typeof text.source_trace_id === "string"
    ? text.source_trace_id
    : undefined

test("replaces only short isolated passive labels with a facing-compatible clear wire", async () => {
  const issueTypes = ["LocalPassiveConnectionShouldBeDirectWire"] as const
  const analyze = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes })
  const issues = (json: CircuitJson) => analyze(json).getIssues()
  const base = await createLocalPassiveNetLabelFixture()
  const original = JSON.stringify(base)
  const detected = issues(base)
  expect(detected).toHaveLength(1)
  expect(detected[0]).toMatchObject({
    firstComponent: { sourceComponentName: "part_a" },
    secondComponent: { sourceComponentName: "part_b" },
    schematicNetLabelIds: [],
  })
  if (detected[0]?.lineItemType !== "LocalPassiveConnectionShouldBeDirectWire")
    throw new Error("Missing expected issue")
  expect(detected[0].schematicTextIds).toHaveLength(2)
  expect(detected[0].replacedSchematicTraceIds).toEqual(["stub_0", "stub_1"])
  expect(detected[0].suggestedRoute).toHaveLength(4)
  expect(JSON.stringify(base)).toBe(original)

  const explicit = structuredClone(base)
  const sourceNet = explicit.find((e) => e.type === "source_net")!
  if (sourceNet.type !== "source_net") throw new Error("Missing fixture net")
  const traces = explicit.filter((e) => e.type === "schematic_trace")
  const textIds = new Set(detected[0].schematicTextIds)
  for (const text of explicit.filter((e) => e.type === "schematic_text")) {
    if (!textIds.has(text.schematic_text_id)) continue
    const stub = traces.find(
      (trace) => trace.source_trace_id === textTraceId(text),
    )!
    const anchor = stub.edges.at(-1)!.to
    explicit.push({
      type: "schematic_net_label",
      schematic_net_label_id: `label_${text.schematic_text_id}`,
      source_net_id: sourceNet.source_net_id,
      source_trace_id: textTraceId(text),
      anchor_side: "left",
      center: { x: anchor.x + 0.3, y: anchor.y },
      anchor_position: anchor,
      text: "arbitrary",
    })
  }
  for (let i = explicit.length - 1; i >= 0; i--) {
    const e = explicit[i]!
    if (e.type === "schematic_text" && textIds.has(e.schematic_text_id))
      explicit.splice(i, 1)
  }
  expect(issues(explicit)).toHaveLength(1)
  expect(issues(explicit)[0]).toMatchObject({ schematicTextIds: [] })
  const attached = structuredClone(explicit)
  const pins = getLocalPassivePins(attached)
  for (const [i, label] of attached
    .filter((e) => e.type === "schematic_net_label")
    .entries()) {
    label.anchor_position = pins[i]!.center
    label.center = { x: pins[i]!.center.x + 0.3, y: pins[i]!.center.y }
  }
  for (let i = attached.length - 1; i >= 0; i--)
    if (attached[i]?.type === "schematic_trace") attached.splice(i, 1)
  expect(issues(attached)).toHaveLength(1)

  // Apply the exact route without changing source connectivity or placement.
  const wired = structuredClone(base)
  for (let i = wired.length - 1; i >= 0; i--) {
    const e = wired[i]!
    if (
      e.type === "schematic_trace" ||
      (e.type === "schematic_text" && textIds.has(e.schematic_text_id))
    )
      wired.splice(i, 1)
  }
  const route = detected[0].suggestedRoute
  wired.push({
    type: "schematic_trace",
    schematic_trace_id: "visible_connection",
    source_trace_id: base.find((e) => e.type === "source_trace")!
      .source_trace_id,
    edges: route.slice(1).map((to, i) => ({ from: route[i]!, to })),
    junctions: [],
  })
  expect(issues(wired)).toEqual([])
  expect(wired.filter((e) => e.type.startsWith("source_"))).toEqual(
    base.filter((e) => e.type.startsWith("source_")),
  )

  const sourcePin = (json: CircuitJson): SourcePort => {
    const id = getLocalPassivePins(json)[0].source_port_id
    const pin = json.find(
      (e) => e.type === "source_port" && e.source_port_id === id,
    )
    if (!pin || pin.type !== "source_port")
      throw new Error("Missing source pin")
    return pin
  }
  const guards: Record<string, (json: CircuitJson) => void> = {
    "power pin": (json) => {
      sourcePin(json).requires_power = true
    },
    "providing power pin": (json) => {
      sourcePin(json).provides_power = true
    },
    "ground pin": (json) => {
      sourcePin(json).requires_ground = true
    },
    "providing ground pin": (json) => {
      sourcePin(json).provides_ground = true
    },
    "voltage pin": (json) => {
      sourcePin(json).requires_voltage = 3.3
    },
    "providing voltage pin": (json) => {
      sourcePin(json).provides_voltage = 0
    },
    "noncomponent rail port": (json) => {
      json.push({
        ...sourcePin(json),
        source_port_id: "external",
        source_component_id: undefined,
        provides_power: true,
      })
    },
    "noncomponent disconnected port": (json) => {
      json.push({
        ...sourcePin(json),
        source_port_id: "external",
        source_component_id: undefined,
        do_not_connect: true,
      })
    },
    "do not connect": (json) => {
      sourcePin(json).do_not_connect = true
    },
    "power net": (json) => {
      for (const e of json) if (e.type === "source_net") e.is_power = true
    },
    "ground net": (json) => {
      for (const e of json) if (e.type === "source_net") e.is_ground = true
    },
    "three component ports": (json) => {
      json.push({ ...sourcePin(json), source_port_id: "third_pin" })
    },
    "missing pin geometry": (json) => {
      const id = getLocalPassivePins(json)[1].schematic_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.schematic_port_id === id,
        ),
        1,
      )
    },
    "duplicate placement": (json) => {
      const e = json.find((e) => e.type === "schematic_component")!
      if (e.type === "schematic_component")
        json.push({ ...e, schematic_component_id: "duplicate" })
    },
    "duplicate pin representation": (json) => {
      json.push({
        ...getLocalPassivePins(json)[0],
        schematic_port_id: "duplicate",
        schematic_component_id: "another_representation",
      })
    },
    "separate schematic block": (json) => {
      const e = json.find((e) => e.type === "schematic_component")!
      if (e.type === "schematic_component") e.schematic_group_id = "other"
    },
    "separate source block": (json) => {
      const e = json.find((e) => e.type === "source_component")!
      if (e.type === "source_component") e.source_group_id = "other"
    },
    "separate sheet": (json) => {
      getLocalPassivePins(json)[1].schematic_sheet_id = "other"
    },
    "non-finite geometry": (json) => {
      getLocalPassivePins(json)[0].center.x = Number.NaN
    },
    "unknown sheet in multisheet schematic": (json) => {
      json.push(
        {
          type: "schematic_component",
          schematic_component_id: "sheet_a",
          source_component_id: "unknown_a",
          center: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          is_box_with_pins: true,
          schematic_sheet_id: "one",
        },
        {
          type: "schematic_component",
          schematic_component_id: "sheet_b",
          source_component_id: "unknown_b",
          center: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          is_box_with_pins: true,
          schematic_sheet_id: "two",
        },
      )
    },
    "actual component sheet disagrees": (json) => {
      const component = json.find((e) => e.type === "schematic_component")!
      if (component.type === "schematic_component")
        component.schematic_sheet_id = "other"
    },
    "invalid trace obstacle": (json) => {
      json.push({
        type: "schematic_trace",
        schematic_trace_id: "invalid",
        source_trace_id: "unrelated",
        edges: [{ from: { x: Number.NaN, y: 0 }, to: { x: 0, y: 0 } }],
        junctions: [],
      })
    },
    "invalid text obstacle": (json) => {
      json.push({
        type: "schematic_text",
        schematic_text_id: "invalid",
        text: "BLOCK",
        position: { x: 2, y: 0 },
        rotation: Number.NaN,
        anchor: "center",
        color: "black",
        font_size: 0.2,
      })
    },
    "invalid label obstacle": (json) => {
      json.push({
        type: "schematic_net_label",
        schematic_net_label_id: "invalid",
        text: "BLOCK",
        source_net_id: "unrelated",
        center: { x: 2, y: Number.NaN },
        anchor_side: "top",
      })
    },
    "no passive type": (json) => {
      for (const e of json)
        if (e.type === "source_component" && e.ftype === "simple_resistor")
          Object.assign(e, { ftype: "simple_chip" })
    },
    "unproved label identity": (json) => {
      for (const e of json)
        if (e.type === "schematic_text" && textIds.has(e.schematic_text_id))
          Object.assign(e, { source_trace_id: "unrelated" })
    },
    "stub junction": (json) => {
      const e = json.find((e) => e.type === "schematic_trace")!
      if (e.type === "schematic_trace") e.junctions = [e.edges[0]!.to]
    },
    "stub branch": (json) => {
      const e = json.find((e) => e.type === "schematic_trace")!
      if (e.type === "schematic_trace")
        json.push({
          ...e,
          schematic_trace_id: "branch",
          edges: [{ from: e.edges[0]!.to, to: { x: e.edges[0]!.to.x, y: -1 } }],
        })
    },
    "pin faces into host": (json) => {
      getLocalPassivePins(json)[0].facing_direction = "left"
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(base)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }

  const falseNames = structuredClone(base)
  for (const e of falseNames) {
    if (e.type === "source_component") e.name = "C1"
    if (e.type === "source_port") {
      e.name = "GND"
      e.port_hints = ["VCC"]
    }
    if (e.type === "source_net") e.name = "POWER"
    if (e.type === "schematic_text" && textIds.has(e.schematic_text_id))
      e.text = "GND"
  }
  expect(issues(falseNames)).toHaveLength(1)
  const falseIdentity = structuredClone(explicit)
  for (const e of falseIdentity)
    if (e.type === "schematic_net_label") e.source_net_id = "unrelated"
  expect(issues(falseIdentity)).toEqual([])

  const blocked = structuredClone(base)
  blocked.push({
    type: "schematic_component",
    schematic_component_id: "barrier",
    source_component_id: "barrier_source",
    center: { x: 2, y: 0.5 },
    size: { width: 0.4, height: 20 },
    is_box_with_pins: true,
  })
  expect(issues(blocked)).toEqual([])
  for (const kind of ["trace", "text", "label"] as const) {
    const json = structuredClone(base)
    if (kind === "trace")
      json.push({
        type: "schematic_trace",
        schematic_trace_id: "barrier",
        source_trace_id: "unrelated",
        edges: [{ from: { x: 2, y: -10 }, to: { x: 2, y: 10 } }],
        junctions: [],
      })
    if (kind === "text")
      json.push({
        type: "schematic_text",
        schematic_text_id: "barrier",
        text: "BLOCK",
        position: { x: 2, y: 0.5 },
        anchor: "center",
        rotation: 90,
        font_size: 8,
        color: "black",
      })
    if (kind === "label")
      json.push({
        type: "schematic_net_label",
        schematic_net_label_id: "barrier",
        source_net_id: "unrelated",
        text: "BLOCK".repeat(40),
        center: { x: 2, y: 0.5 },
        anchor_position: { x: 2, y: 10 },
        anchor_side: "top",
      })
    expect(issues(json), kind).toEqual([])
    for (const e of json)
      if (
        (e.type === "schematic_text" && e.schematic_text_id === "barrier") ||
        (e.type === "schematic_trace" && e.schematic_trace_id === "barrier") ||
        (e.type === "schematic_net_label" &&
          e.schematic_net_label_id === "barrier")
      )
        e.schematic_sheet_id = "another"
    expect(issues(json), `${kind} on another sheet`).toHaveLength(1)
  }

  for (const [variant, json] of [
    ["trace-backed-text", base],
    ["explicit-labels", explicit],
    ["labels-at-pins", attached],
    ["direct-wire", wired],
    ["blocked-route", blocked],
  ] as const)
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        analysis: analyze(json),
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
})
