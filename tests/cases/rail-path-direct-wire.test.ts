import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

function createDirectRailPathCircuitJson(power: boolean): CircuitJson {
  const base = createRailPathRepro({ power }).filter((element) => {
    if (
      element.type === "source_component" &&
      element.source_component_id !== "host"
    ) {
      return false
    }
    if (
      element.type === "schematic_component" &&
      element.schematic_component_id !== "sch-host"
    ) {
      return false
    }
    if (
      element.type === "source_port" &&
      element.source_component_id !== "host"
    ) {
      return false
    }
    if (
      element.type === "schematic_port" &&
      element.schematic_component_id !== "sch-host"
    ) {
      return false
    }
    if (element.type === "schematic_trace") return false
    if (
      element.type === "schematic_net_label" &&
      element.schematic_net_label_id !== "label-lower"
    ) {
      return false
    }
    return true
  })

  for (const element of base) {
    if (
      element.type === "source_port" &&
      element.source_port_id === "host-sense"
    ) {
      element.subcircuit_connectivity_map_key = "rail"
    }
  }

  base.push({
    type: "schematic_trace",
    schematic_trace_id: "direct-rail-wire",
    source_trace_id: "direct-rail-wire",
    subcircuit_connectivity_map_key: "rail",
    edges: [
      { from: { x: 6.5, y: 4 }, to: { x: -1, y: 4 } },
      { from: { x: -1, y: 4 }, to: { x: -1, y: -7.7 } },
    ],
    junctions: [],
    schematic_sheet_id: "visibility-sheet",
  })

  return base
}

test("direct long rail wires without support elements advise shortening the wire or using a local rail symbol", () => {
  const groundCircuit = createDirectRailPathCircuitJson(false)
  const groundAnalysis = analyzeSchematicPlacement(groundCircuit, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const groundIssues = groundAnalysis.getIssues()
  expect(groundIssues).toHaveLength(1)
  const groundIssue = groundIssues[0]
  if (groundIssue?.lineItemType !== "RailPathTooSpreadOut") {
    throw new Error("Expected RailPathTooSpreadOut finding")
  }
  expect(groundIssue.supportSchematicBoxes).toEqual([])
  expect(groundIssue.message).toContain(
    "shorten the visible wire or connect U_PD.VBUS_VS_DISCH to a nearby ground symbol.",
  )
  expect(groundIssue.message).not.toContain(
    "move the connected support elements",
  )

  const powerCircuit = createDirectRailPathCircuitJson(true)
  const powerIssues = analyzeSchematicPlacement(powerCircuit, {
    issueTypes: ["RailPathTooSpreadOut"],
  }).getIssues()
  expect(powerIssues).toHaveLength(1)
  if (powerIssues[0]?.lineItemType !== "RailPathTooSpreadOut") {
    throw new Error("Expected RailPathTooSpreadOut finding")
  }
  expect(powerIssues[0].supportSchematicBoxes).toEqual([])
  expect(powerIssues[0].message).toContain(
    "shorten the visible wire or connect U_PD.VBUS_VS_DISCH to a nearby power symbol.",
  )
  expect(powerIssues[0].message).not.toContain(
    "move the connected support elements",
  )

  expect(
    createIssueReproSnapshot({
      circuitJson: groundCircuit,
      analysis: groundAnalysis,
      issueTypes: ["RailPathTooSpreadOut"],
      width: 1100,
      height: 750,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
