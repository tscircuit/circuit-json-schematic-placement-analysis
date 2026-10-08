import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import {
  analyzeSchematicPlacement,
  createSchematicPlacementIssueArtifacts,
} from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { expectReproRendered } from "../fixtures/placement-repro-assertions"

async function render({
  rotation = 0,
  layout = "staggered",
  variant = "normal",
}: {
  rotation?: number
  layout?:
    | "staggered"
    | "crossed_connections"
    | "different_axes"
    | "offset"
    | "overlap"
  variant?: string
} = {}) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const a = (rotation * Math.PI) / 180
  const point = (x: number, y: number) => ({
    schX: x * Math.cos(a) - y * Math.sin(a),
    schY: x * Math.sin(a) + y * Math.cos(a),
  })
  circuit.add(
    <board schTraceAutoLabelEnabled={false} schMaxTraceDistance={100}>
      <net
        name="GND"
        isGroundNet={variant !== "unmarked-ground" && variant !== "ground-pin"}
      />
      <net name="VCC" isPowerNet={variant === "power-net"} />
      <chip
        name="host"
        {...point(0, 4)}
        pinLabels={{ pin1: "unknown", pin2: "unknown2", pin3: "unknown3" }}
        pinAttributes={{
          pin1: { requiresPower: variant === "power-pin" },
          pin2: { requiresGround: variant === "ground-pin" },
        }}
        connections={{
          pin1: "net.VCC",
          ...(variant === "ground-pin" ? { pin2: "net.GND" } : {}),
        }}
      />
      <resistor
        name="partA"
        resistance={variant === "zero" ? "0" : "10k"}
        {...point(0, 0)}
        schRotation={rotation - 90}
        connections={{ pin1: "net.VCC", pin2: "net.GND" }}
      />
      <capacitor
        name="partB"
        capacitance="1nF"
        {...point(
          layout === "overlap" || layout === "staggered" ? 0 : 2,
          layout === "staggered" ? -3 : layout === "offset" ? 0.15 : 0,
        )}
        schRotation={
          rotation -
          90 +
          (layout === "crossed_connections"
            ? 180
            : layout === "different_axes"
              ? 90
              : 0)
        }
        connections={{
          pin1: variant === "series" ? "net.other" : "net.VCC",
          pin2: "net.GND",
        }}
      />
      {variant === "bank" && (
        <capacitor
          name="extra"
          capacitance="2nF"
          {...point(3, 0)}
          connections={{ pin1: "net.VCC", pin2: "net.GND" }}
        />
      )}
      {variant === "bus" && (
        <chip
          name="another"
          pinLabels={{ pin1: "unknown" }}
          {...point(-4, 4)}
          connections={{ pin1: "net.VCC" }}
        />
      )}
      {variant === "shorted" && <trace from="net.VCC" to="net.GND" />}
    </board>,
  )
  await circuit.renderUntilSettled()
  const json = circuit.getCircuitJson()
  expectReproRendered(json, variant === "bank" || variant === "bus" ? 4 : 3)
  return json
}
const issueTypes = ["ParallelRcNotAligned"] as const
const issues = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes }).getIssues()

test("identifies a unique grounded parallel RC using topology and accepts offset parallel branches", async () => {
  for (const rotation of [0, 90, 180, 270]) {
    for (const layout of [
      "staggered",
      "crossed_connections",
      "different_axes",
      "offset",
    ] as const) {
      const json = await render({ rotation, layout })
      const original = JSON.stringify(json)
      const result = issues(json)
      expect(result).toHaveLength(layout === "offset" ? 0 : 1)
      if (result.length) expect(result[0]).toMatchObject({ reason: layout })
      const analysis = analyzeSchematicPlacement(json)
      expect(analysis.getIssues({ issueTypes })).toEqual(result)
      expect(analysis.getIssueCounts().ParallelRcNotAligned).toBe(result.length)
      expect(JSON.stringify(json)).toBe(original)
    }
  }
  for (const variant of [
    "unmarked-ground",
    "power-net",
    "power-pin",
    "zero",
    "bank",
    "bus",
    "series",
    "shorted",
  ])
    expect(issues(await render({ variant })), variant).toEqual([])
  expect(issues(await render({ layout: "overlap" }))).toEqual([])
  expect(issues(await render({ variant: "ground-pin" }))).toHaveLength(1)
  const json = await render()
  const renamed = structuredClone(json)
  for (const e of renamed) {
    if (e.type === "source_port") {
      e.name = "unknown"
      e.port_hints = []
    }
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "unknown"
  }
  expect(issues(renamed)).toHaveLength(1)
  const capId = json.find(
    (e) => e.type === "source_component" && e.ftype === "simple_capacitor",
  )!
  if (capId.type !== "source_component") throw Error("Missing capacitor")
  for (const variant of [
    "sheet",
    "subcircuit",
    "duplicate",
    "missing-pin",
    "no-connect",
    "dnp",
    "nonfinite",
    "missing-component",
  ]) {
    const altered = structuredClone(json)
    const cap = altered.find(
      (e) =>
        e.type === "schematic_component" &&
        e.source_component_id === capId.source_component_id,
    )!
    if (cap.type !== "schematic_component")
      throw Error("Missing capacitor placement")
    if (variant === "sheet") cap.schematic_sheet_id = "another-sheet"
    if (variant === "subcircuit") cap.subcircuit_id = "another-subcircuit"
    if (variant === "duplicate")
      altered.push({ ...cap, schematic_component_id: "duplicate" })
    if (variant === "nonfinite") cap.center.x = Number.NaN
    if (variant === "dnp")
      altered.push({
        type: "pcb_component",
        pcb_component_id: "unpopulated",
        source_component_id: capId.source_component_id,
        center: { x: 0, y: 0 },
        width: 1,
        height: 1,
        layer: "top",
        rotation: 0,
        do_not_place: true,
        obstructs_within_bounds: true,
      })
    if (variant === "no-connect")
      for (const p of altered)
        if (
          p.type === "source_port" &&
          p.source_component_id === capId.source_component_id
        )
          p.do_not_connect = true
    expect(
      issues(
        altered.filter(
          (e) =>
            !(variant === "missing-pin" && e.type === "schematic_port") &&
            !(
              variant === "missing-component" &&
              e.type === "source_component" &&
              e.source_component_id === capId.source_component_id
            ),
        ),
      ),
      variant,
    ).toEqual([])
  }
  // PCB-only grouping does not split a three-port net on the same sheet.
  const grouped = structuredClone(json)
  for (const e of grouped)
    if (
      e.type === "schematic_component" &&
      e.source_component_id === capId.source_component_id
    )
      e.schematic_group_id = "pcb-fanout"
  expect(issues(grouped)).toHaveLength(1)
  const analysis = analyzeSchematicPlacement(json, { issueTypes })
  const artifacts = createSchematicPlacementIssueArtifacts(json, {
    analysis,
    issueTypes,
  })
  expect(artifacts).toHaveLength(1)
  expect(artifacts[0]!.bounds).toBeDefined()
  expect(artifacts[0]!.descriptionXml).toContain("ParallelRcNotAligned")
  expect(artifacts[0]!.content).toContain("data-issue-index=")
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson: json,
      analysis,
      highlightIssues: ["ParallelRcNotAligned"],
      width: 1000,
      height: 650,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
