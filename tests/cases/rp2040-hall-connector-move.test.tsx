import { expect, test } from "bun:test"
import type { CircuitJson, SchematicTrace } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { getRp2040BldcSheet } from "../assets/rp2040-bldc-controller"
import { renderRp2040HallSheet } from "../assets/rp2040-bldc-controller/hall-sheet"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

const signals = ["A", "B", "C"] as const
const connectorIssues = (json: CircuitJson) =>
  analyzeSchematicPlacement(json).getIssues({
    issueTypes: ["ConnectorPositionCausesTraceDetours"],
  })
const length = (trace: SchematicTrace) =>
  trace.edges.reduce(
    (sum, { from, to }) => sum + Math.hypot(to.x - from.x, to.y - from.y),
    0,
  )
const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y) < 0.00001

function schematicPort(json: CircuitJson, name: string, pin: string) {
  const source = getReproSourcePort(json, name, pin)
  return json.find(
    (e) =>
      e.type === "schematic_port" && e.source_port_id === source.source_port_id,
  )!
}

function signalRoute(json: CircuitJson, signal: (typeof signals)[number]) {
  const key = getReproSourcePort(
    json,
    "J_HALL",
    `HALL_${signal}`,
  ).subcircuit_connectivity_map_key
  const traces = json.filter(
    (e): e is SchematicTrace =>
      e.type === "schematic_trace" && e.subcircuit_connectivity_map_key === key,
  )
  expect(traces).toHaveLength(1)
  return traces[0]!
}

test("rerenders the complete Hall sheet after moving only J_HALL", async () => {
  const frozen = getRp2040BldcSheet("hall")
  const unchangedFrozen = JSON.stringify(frozen)
  const suggestion = connectorIssues(frozen)[0]!
  if (suggestion.lineItemType !== "ConnectorPositionCausesTraceDetours")
    throw new Error("Expected the real Hall connector finding")

  const before = await renderRp2040HallSheet()
  // Apply the saved repro's actual suggestion, not a hand-picked improvement.
  const after = await renderRp2040HallSheet({
    x: suggestion.newSchX,
    y: suggestion.newSchY,
  })
  const nets = [
    ["J_HALL.HALL_5V", "net.V5"],
    [
      "J_HALL.GND",
      "net.GND",
      ...signals.flatMap((s) => [`R_HALL_${s}_BOT.pin2`, `C_HALL_${s}.pin2`]),
    ],
    ...signals.flatMap((s) => [
      [`J_HALL.HALL_${s}`, `R_HALL_${s}_TOP.pin1`],
      [
        `R_HALL_${s}_TOP.pin2`,
        `R_HALL_${s}_BOT.pin1`,
        `C_HALL_${s}.pin1`,
        `net.MCU_HALL_${s}_GPIO`,
      ],
    ]),
  ]
  for (const json of [frozen, before, after]) {
    expectReproRendered(json, 10)
    const scope = getReproSourcePort(json, "J_HALL", "pin1").subcircuit_id
    expectReproNets(
      json.filter((e) => e.type !== "source_net" || e.subcircuit_id === scope),
      nets,
    )
  }
  expect(connectorIssues(before)).toHaveLength(1)
  expect(connectorIssues(after)).toHaveLength(0)

  // Check every Hall component against the original sheet. Symbol bounds can
  // differ because this TSX rebuild uses the repository's pinned core version.
  for (const source of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(frozen, source.name!)
    const first = getReproSchematicComponent(before, source.name!)
    const second = getReproSchematicComponent(after, source.name!)
    expect(first.center).toEqual(original.center)
    expect(first.port_arrangement).toEqual(original.port_arrangement)
    expect(first.symbol_name).toBe(original.symbol_name)
    expect(first.symbol_display_value).toBe(original.symbol_display_value)
    if (source.name === "J_HALL") {
      expect(second).toEqual({
        ...first,
        center: { x: suggestion.newSchX, y: suggestion.newSchY },
      })
    } else {
      expect(second).toEqual(first)
    }
  }
  const electricalRecords = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
      ].includes(e.type),
    )
  expect(electricalRecords(after)).toEqual(electricalRecords(before))

  // Verify physical connector pin numbers, labels and relative positions too.
  for (let pin = 1; pin <= 5; pin++) {
    const first = schematicPort(before, "J_HALL", `pin${pin}`)
    const second = schematicPort(after, "J_HALL", `pin${pin}`)
    if (first.type !== "schematic_port" || second.type !== "schematic_port")
      throw new Error("Missing connector pin")
    expect(second.pin_number).toBe(first.pin_number)
    expect(second.display_pin_label).toBe(first.display_pin_label)
    expect(second.facing_direction).toBe(first.facing_direction)
    expect(second.center.x - first.center.x).toBeCloseTo(suggestion.deltaSchX)
    expect(second.center.y - first.center.y).toBeCloseTo(suggestion.deltaSchY)
  }

  for (const signal of signals) {
    const route = signalRoute(after, signal)
    const start = schematicPort(after, "J_HALL", `HALL_${signal}`)
    const end = schematicPort(after, `R_HALL_${signal}_TOP`, "pin1")
    if (start.type !== "schematic_port" || end.type !== "schematic_port")
      throw new Error("Missing signal endpoint")
    expect(
      (near(route.edges[0]!.from, start.center) &&
        near(route.edges.at(-1)!.to, end.center)) ||
        (near(route.edges[0]!.from, end.center) &&
          near(route.edges.at(-1)!.to, start.center)),
    ).toBe(true)
    for (let i = 1; i < route.edges.length; i++)
      expect(near(route.edges[i - 1]!.to, route.edges[i]!.from)).toBe(true)
    // Actual rerouted wires attain the orthogonal shortest-path distance.
    expect(length(route)).toBeCloseTo(
      Math.abs(start.center.x - end.center.x) +
        Math.abs(start.center.y - end.center.y),
    )
    if (signal !== "B")
      expect(length(route)).toBeLessThan(
        length(signalRoute(before, signal)) / 2,
      )
  }

  // Both rail symbols must remain visibly connected to the moved connector.
  for (const [pin, rail] of [
    ["pin1", "V5"],
    ["pin2", "GND"],
  ]) {
    const port = schematicPort(after, "J_HALL", pin!)
    if (port.type !== "schematic_port") throw new Error("Missing rail pin")
    const net = after.find((e) => e.type === "source_net" && e.name === rail)
    if (net?.type !== "source_net") throw new Error("Missing rail")
    expect(
      after.some((e) => {
        if (e.type !== "schematic_trace") return false
        const ends = [e.edges[0]!.from, e.edges.at(-1)!.to]
        return (
          ends.some((p) => near(p, port.center)) &&
          after.some(
            (label) =>
              label.type === "schematic_net_label" &&
              label.source_net_id === net.source_net_id &&
              label.anchor_position &&
              ends.some((p) => near(p, label.anchor_position!)),
          )
        )
      }),
    ).toBe(true)
  }

  for (const [name, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        width: 1800,
        height: 1200,
      }).replace(/[ \t]+$/gm, ""),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
  expect(JSON.stringify(frozen)).toBe(unchangedFrozen)
})
