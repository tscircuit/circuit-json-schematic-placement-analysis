import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
} from "../fixtures/placement-repro-assertions"

async function createInterface({
  x = 7,
  y = 0,
  branched = false,
  wiredGround = false,
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net name="GND" isGroundNet />
      <pinheader
        name="J1"
        pinCount={4}
        schX={x}
        schY={y}
        pinLabels={{ pin1: "GND", pin2: "A", pin3: "B", pin4: "C" }}
        schPinArrangement={{
          rightSide: { pins: [1, 2, 3, 4], direction: "top-to-bottom" },
        }}
      />
      <trace from=".J1 > .GND" to="net.GND" />
      {["A", "B", "C"].map((signal, i) => (
        <Fragment key={signal}>
          <resistor
            name={`R_${signal}`}
            resistance="1k"
            schX={-5}
            schY={4 - 4 * i}
          />
          <trace from={`.J1 > .${signal}`} to={`.R_${signal} > .pin1`} />
          <trace from={`.R_${signal} > .pin2`} to={`net.OUT_${signal}`} />
        </Fragment>
      ))}
      {branched && (
        <>
          <resistor name="R_BRANCH" resistance="10k" schX={12} schY={5} />
          <trace from=".J1 > .A" to=".R_BRANCH > .pin1" />
        </>
      )}
      {wiredGround && (
        <>
          <resistor name="R_GND" resistance="1k" schX={12} schY={3} />
          <trace from=".J1 > .GND" to=".R_GND > .pin1" />
        </>
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

const findings = (json: CircuitJson) =>
  analyzeSchematicPlacement(json)
    .getIssues()
    .filter(
      (issue) => issue.lineItemType === "ConnectorPositionCausesTraceDetours",
    )

test("moves the whole connector without changing pins and skips ambiguous or obstructed moves", async () => {
  const original = await createInterface()
  expectReproRendered(original, 4)
  const nets = [
    ["J1.A", "R_A.pin1"],
    ["J1.B", "R_B.pin1"],
    ["J1.C", "R_C.pin1"],
  ]
  expectReproNets(original, nets)
  const before = JSON.stringify(original)
  const issues = findings(original)
  expect(JSON.stringify(original)).toBe(before)
  expect(issues).toHaveLength(1)
  const move = issues[0]!
  expect(move.evaluatedSignalCount).toBe(3)
  expect(move.schematicTraceIds.length).toBeGreaterThanOrEqual(2)
  expect(move.suggestedTotalSignalDistance).toBeLessThan(
    move.currentTotalSignalDistance * 0.75,
  )
  const improved = await createInterface({ x: move.newSchX, y: move.newSchY })
  expectReproNets(improved, nets)
  expect(findings(improved)).toEqual([])
  const pinOrder = (json: CircuitJson) =>
    json.filter((e) => e.type === "source_port").map((p) => p.name)
  expect(pinOrder(improved)).toEqual(pinOrder(original))
  // The same circuit rotated as a whole must give the same physical move.
  const rotated = structuredClone(original)
  const turn = ({ x, y }: { x: number; y: number }) => ({ x: -y, y: x })
  const facing = {
    right: "up",
    up: "left",
    left: "down",
    down: "right",
  } as const
  let expected = { x: move.newSchX, y: move.newSchY }
  for (let rotation = 1; rotation <= 3; rotation++) {
    for (const element of rotated) {
      if (element.type === "schematic_component") {
        element.center = turn(element.center)
        element.size = {
          width: element.size.height,
          height: element.size.width,
        }
      }
      if (element.type === "schematic_port") {
        element.center = turn(element.center)
        if (element.facing_direction)
          element.facing_direction = facing[element.facing_direction]
      }
      if (element.type === "schematic_trace")
        for (const edge of element.edges) {
          edge.from = turn(edge.from)
          edge.to = turn(edge.to)
        }
      if (element.type === "schematic_net_label" && element.anchor_position)
        element.anchor_position = turn(element.anchor_position)
    }
    expected = turn(expected)
    const suggestions = findings(rotated)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]!.newSchX).toBeCloseTo(expected.x)
    expect(suggestions[0]!.newSchY).toBeCloseTo(expected.y)
  }
  expect(
    createIssueReproSnapshot({
      circuitJson: improved,
      analysis: analyzeSchematicPlacement(improved),
      issueTypes: ["ConnectorPositionCausesTraceDetours"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  for (const options of [{ branched: true }, { wiredGround: true }])
    expect(findings(await createInterface(options))).toEqual([])
  const labeledOnly = original.filter((e) => e.type !== "schematic_trace")
  expect(findings(labeledOnly)).toEqual([])
  for (const field of ["schematic_sheet_id", "schematic_group_id"] as const) {
    const separated = structuredClone(original)
    const peer = separated.find(
      (e) =>
        e.type === "schematic_component" &&
        e.schematic_component_id ===
          move.connectedComponents[0]!.schematicComponentId,
    )!
    if (peer.type !== "schematic_component") throw new Error("Missing peer")
    peer[field] = "separate-block"
    expect(findings(separated)).toEqual([])
  }
  const obstructed = structuredClone(original)
  const obstacle = structuredClone(
    obstructed.find((e) => e.type === "schematic_component")!,
  )
  if (obstacle.type !== "schematic_component")
    throw new Error("Missing component")
  obstacle.schematic_component_id = "obstacle"
  obstacle.source_component_id = "obstacle-source"
  obstacle.center = { x: move.newSchX, y: move.newSchY }
  obstructed.push(obstacle)
  expect(findings(obstructed)).toEqual([])
})
