import { expect, test } from "bun:test"
import type { CircuitJson, SchematicTrace } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { watchyI2cPullups as before } from "../assets/watchy-i2c-pullups"
import { getGroupedWatchyI2cPullups } from "../assets/watchy-i2c-pullups/grouped"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y) < 0.00001

test("Watchy I2C pull-ups: draw a shared vertical rail while keeping the published nets", () => {
  const frozen = JSON.stringify(before)
  const after = getGroupedWatchyI2cPullups()
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json).getIssues({
      issueTypes: ["I2cPullupPairNotGrouped"],
    })
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])

  const sourceRecords = (json: CircuitJson) =>
    json.filter((element) => element.type.startsWith("source_"))
  expect(sourceRecords(after)).toEqual(sourceRecords(before))
  const unchangedSchematic = (json: CircuitJson) =>
    json.filter((element) => {
      if (element.type === "schematic_component")
        return !["schematic_component_73", "schematic_component_80"].includes(
          element.schematic_component_id,
        )
      if (element.type === "schematic_port")
        return !["schematic_component_73", "schematic_component_80"].includes(
          element.schematic_component_id ?? "",
        )
      if (element.type === "schematic_trace")
        return ![
          "schematic_trace_140",
          "schematic_trace_144",
          "schematic_trace_148",
          "schematic_trace_149",
        ].includes(element.schematic_trace_id)
      if (element.type === "schematic_text")
        return ![
          "schematic_text_114",
          "schematic_text_117",
          "schematic_text_123",
        ].includes(element.schematic_text_id)
      return element.type.startsWith("schematic_")
    })
  expect(unchangedSchematic(after)).toEqual(unchangedSchematic(before))
  expect(getReproSchematicComponent(after, "R20").center.y).toBe(
    getReproSchematicComponent(after, "R18").center.y,
  )
  expect(
    after.some(
      (element) =>
        element.type === "schematic_text" &&
        element.schematic_text_id === "schematic_text_114",
    ),
  ).toBe(false)
  for (const name of ["R18", "R20"]) {
    expect(getReproSchematicComponent(after, name).symbol_name).toBe(
      "boxresistor_up",
    )
  }

  const movedScl = after.find(
    (element) =>
      element.type === "schematic_port" &&
      element.schematic_port_id === "schematic_port_273",
  )!
  const movedPower = after.find(
    (element) =>
      element.type === "schematic_port" &&
      element.schematic_port_id === "schematic_port_274",
  )!
  const u6Scl = after.find(
    (element) =>
      element.type === "schematic_port" &&
      element.schematic_port_id === "schematic_port_254",
  )!
  if (
    movedScl.type !== "schematic_port" ||
    movedPower.type !== "schematic_port" ||
    u6Scl.type !== "schematic_port"
  )
    throw new Error("Missing real Watchy ports")
  const sclTrace = after.find(
    (element): element is SchematicTrace =>
      element.type === "schematic_trace" &&
      element.schematic_trace_id === "schematic_trace_140",
  )!
  const powerTrace = after.find(
    (element): element is SchematicTrace =>
      element.type === "schematic_trace" &&
      element.schematic_trace_id === "schematic_trace_148",
  )!
  const r18PowerTrace = after.find(
    (element): element is SchematicTrace =>
      element.type === "schematic_trace" &&
      element.schematic_trace_id === "schematic_trace_144",
  )!
  expect(near(sclTrace.edges[0]!.from, u6Scl.center)).toBe(true)
  expect(near(sclTrace.edges.at(-1)!.to, movedScl.center)).toBe(true)
  expect(near(powerTrace.edges[0]!.from, movedPower.center)).toBe(true)
  expect(near(powerTrace.edges.at(-1)!.to, r18PowerTrace.edges[0]!.to)).toBe(
    true,
  )
  for (let i = 1; i < sclTrace.edges.length; i++)
    expect(near(sclTrace.edges[i - 1]!.to, sclTrace.edges[i]!.from)).toBe(true)

  const snapshots: string[] = []
  for (const json of [before, after]) {
    expectReproRendered(json, 16)
    expectReproNets(json, [
      ["R18.pin1", "U6.pin2", "net.SDA"],
      ["R20.pin1", "U6.pin12", "net.SCL"],
      ["R18.pin2", "R20.pin2", "net.P3V3"],
    ])
    snapshots.push(
      createIssueReproSnapshot({
        circuitJson: json,
        analysis: analyzeSchematicPlacement(json),
        schematicSheetId: "schematic_sheet_3",
        issueTypes: ["I2cPullupPairNotGrouped"],
        showOverlay: true,
        width: 1000,
        height: 750,
      }),
    )
  }
  // The after view has no issue to define a crop. Use the before view's
  // schematic viewport so the two real-board snapshots compare at one scale.
  const schematicViewBox = (svg: string) =>
    svg.match(/class="tscircuit-schematic"[^>]*\bviewBox="([^"]+)"/)?.[1]
  const beforeViewBox = schematicViewBox(snapshots[0]!)
  expect(beforeViewBox).toBeString()
  const screenTransform = (svg: string) =>
    svg.match(/data-real-to-screen-transform="([^"]+)"/)?.[1]
  expect(screenTransform(snapshots[1]!)).toBe(screenTransform(snapshots[0]!))
  snapshots[1] = snapshots[1]!.replace(
    /(<svg[^>]*class="tscircuit-schematic"[^>]*)(>)/,
    (_, tag: string) => `${tag} viewBox="${beforeViewBox}">`,
  )
  expect(schematicViewBox(snapshots[1]!)).toBe(beforeViewBox)
  expect(snapshots[0]).toMatchSvgSnapshot(import.meta.path, "before")
  expect(snapshots[1]).toMatchSvgSnapshot(import.meta.path, "after")
  expect(JSON.stringify(before)).toBe(frozen)
})
