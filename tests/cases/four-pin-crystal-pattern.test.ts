import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import network from "../assets/rp2040-crystal-load-network.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("provides the four-component crystal reference pattern positions, rotations and pin layout", () => {
  const circuitJson = structuredClone(network) as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson
      .filter((e) => e.type === "source_component")
      .map((e) => e.ftype)
      .sort(),
  ).toEqual([
    "simple_capacitor",
    "simple_capacitor",
    "simple_crystal",
    "simple_resistor",
  ])
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(4)
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["FourPinCrystalPatternMismatch"],
  })
  expect(issues).toHaveLength(1)
  const issue = issues[0]!
  if (issue.lineItemType !== "FourPinCrystalPatternMismatch")
    throw new Error("Missing pattern diagnostic")
  expect(
    issue.suggestedPlacements.map((t) => ({
      name: t.schematicBox.sourceComponentName,
      x: t.newSchX,
      y: t.newSchY,
      rotation: t.deltaSchRotation,
    })),
  ).toEqual([
    { name: "Y1", x: -7.9, y: -5, rotation: -90 },
    { name: "C_XIN", x: -9.9, y: -3.29, rotation: -90 },
    { name: "C_XOUT", x: -9.9, y: -6.71, rotation: -90 },
    { name: "R_XOUT", x: -5.9, y: -6.71, rotation: 0 },
  ])
  expect(issue.suggestedPlacements[0]!.pins).toEqual([
    {
      sourcePortId: "source_port_113",
      pinNumber: 1,
      newSchX: -7.91,
      newSchY: -4.46,
    },
    {
      sourcePortId: "source_port_114",
      pinNumber: 3,
      newSchX: -7.91,
      newSchY: -5.54,
    },
    {
      sourcePortId: "source_port_112",
      pinNumber: 2,
      newSchX: -8.61,
      newSchY: -4.98,
    },
    {
      sourcePortId: "source_port_111",
      pinNumber: 4,
      newSchX: -7.19,
      newSchY: -5,
    },
  ])
  expect(issue.message).toContain(
    "both load capacitors horizontally to its left",
  )
  expect(issue.message).toContain(
    "series resistor horizontally to its lower right",
  )
  expect(issue.message).toContain("grounded case pins on opposite sides")
  expect(analysis.schematicIssuesToString(issue)).toContain(
    "rotate by -90 degrees",
  )
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["FourPinCrystalPatternMismatch"],
      showOverlay: true,
      width: 1200,
      height: 700,
    }),
  ).toMatchSvgSnapshot(import.meta.path)

  // Applying all component and pin targets must clear this diagnostic.
  for (const target of issue.suggestedPlacements) {
    for (const e of circuitJson) {
      if (
        e.type === "schematic_component" &&
        e.schematic_component_id === target.schematicBox.schematicComponentId
      )
        e.center = { x: target.newSchX, y: target.newSchY }
      if (e.type === "schematic_port") {
        const p = target.pins.find((p) => p.sourcePortId === e.source_port_id)
        if (p) e.center = { x: p.newSchX, y: p.newSchY }
      }
    }
  }
  expect(
    analyzeSchematicPlacement(circuitJson).getIssues({
      issueTypes: ["FourPinCrystalPatternMismatch"],
    }),
  ).toHaveLength(0)
})
