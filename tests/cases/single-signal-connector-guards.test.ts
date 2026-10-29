import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { create555OutputConnector } from "../assets/555-output-connector"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
const analyze = (j: CircuitJson) =>
  analyzeSchematicPlacement(j, {
    issueTypes: ["ConnectorPositionCausesTraceDetours"],
  })
test("requires a private signal, movable return and clear destination for a single-signal connector", async () => {
  const original = await create555OutputConnector(),
    copy = structuredClone(original)
  const move = analyze(original).getIssues()[0]!
  if (move.lineItemType !== "ConnectorPositionCausesTraceDetours")
    throw new Error("Missing move")
  expect(original).toEqual(copy)
  const renamed = original.map((e, i) =>
    e.type === "source_component" ||
    e.type === "source_port" ||
    e.type === "source_net"
      ? {
          ...e,
          name: `opaque_${i}`,
          ...(e.type === "source_port" ? { port_hints: [] } : {}),
        }
      : e,
  )
  expect(analyze(renamed).getIssues()).toHaveLength(1)
  const rotated = structuredClone(original),
    turn = ({ x, y }: { x: number; y: number }) => ({ x: -y, y: x }),
    facing = { left: "down", down: "right", right: "up", up: "left" } as const
  let target = { x: move.newSchX, y: move.newSchY }
  for (let n = 1; n <= 3; n++) {
    for (const e of rotated) {
      if (e.type === "schematic_component") {
        e.center = turn(e.center)
        e.size = { width: e.size.height, height: e.size.width }
      }
      if (e.type === "schematic_port") {
        e.center = turn(e.center)
        if (e.facing_direction) e.facing_direction = facing[e.facing_direction]
      }
      if (e.type === "schematic_trace")
        for (const edge of e.edges) {
          edge.from = turn(edge.from)
          edge.to = turn(edge.to)
        }
      if (e.type === "schematic_net_label" && e.anchor_position)
        e.anchor_position = turn(e.anchor_position)
    }
    target = turn(target)
    const found = analyze(rotated).getIssues()[0]
    expect(found).toMatchObject({
      lineItemType: "ConnectorPositionCausesTraceDetours",
      newSchX: target.x,
      newSchY: target.y,
    })
  }
  const sourcePorts = original.filter((e) => e.type === "source_port")
  const header = original.find(
    (e) => e.type === "source_component" && e.ftype === "simple_pin_header",
  )!
  if (header.type !== "source_component") throw new Error("Missing header")
  const hostGround = sourcePorts.find(
    (e) =>
      e.source_component_id !== header.source_component_id &&
      e.pin_number === 1,
  )!
  const hostSignal = sourcePorts.find(
    (e) =>
      e.source_component_id !== header.source_component_id &&
      e.pin_number === 3,
  )!
  const host = original.find(
    (e) =>
      e.type === "schematic_component" &&
      e.source_component_id === hostSignal.source_component_id,
  )!
  if (host.type !== "schematic_component") throw new Error("Missing host")
  const controls: Record<string, CircuitJson> = {
    "return would lengthen": original.map((e) =>
      e.type === "schematic_trace" &&
      e.edges.some(
        (edge) =>
          Math.abs(edge.to.x - 5.6) < 0.001 &&
          Math.abs(edge.to.y + 0.1) < 0.001,
      )
        ? { ...e, junctions: [{ x: 5.7, y: -0.1 }] }
        : e,
    ),
    "unclassified return": original.map((e) =>
      e.type === "source_net" ? { ...e, is_ground: false } : e,
    ),
    "contradictory return": original.map((e) =>
      e.type === "source_net" && e.is_ground ? { ...e, is_power: true } : e,
    ),
    "do not connect": original.map((e) =>
      e.type === "source_port" &&
      e.source_component_id === header.source_component_id
        ? { ...e, do_not_connect: true }
        : e,
    ),
    "no drawn detour": original.filter((e) => e.type !== "schematic_trace"),
    "branched signal": [
      ...original,
      { ...hostSignal, source_port_id: "branch", pin_number: 9 },
    ],
    "branched return": [
      ...original,
      { ...hostGround, source_port_id: "return-branch", pin_number: 10 },
    ],
    "different scope": original.map((e) =>
      e.type === "schematic_component" &&
      e.schematic_component_id === host.schematic_component_id
        ? { ...e, schematic_sheet_id: "other-sheet" }
        : e,
    ),
    "body blocks target": [
      ...original,
      {
        ...host,
        schematic_component_id: "obstacle",
        source_component_id: "obstacle-source",
        center: { x: move.newSchX, y: move.newSchY },
      },
    ],
    "body blocks corridor": [
      ...original,
      {
        ...host,
        schematic_component_id: "obstacle",
        source_component_id: "obstacle-source",
        center: { x: -2.2, y: -0.1 },
        size: { width: 0.3, height: 0.3 },
      },
    ],
    "foreign return": original.map((e) =>
      e.type === "source_port" && e.source_port_id === hostGround.source_port_id
        ? { ...e, source_component_id: "foreign" }
        : e,
    ),
  }
  for (const [name, json] of Object.entries(controls))
    expect(analyze(json).getIssues(), name).toEqual([])
  expect(
    analyze(
      await create555OutputConnector({ x: move.newSchX, y: move.newSchY }),
    ).getIssues(),
  ).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: rotated,
      analysis: analyze(rotated),
      showFullSchematic: true,
      showIssueGeometry: false,
      width: 1000,
      height: 700,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "rotated")
})
