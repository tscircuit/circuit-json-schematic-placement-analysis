import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { getRelevantPlacementsForIssues } from "lib/utils/issue-context"
import { createPocketAudioFilteredDivider } from "../assets/pocket-audio-filtered-divider"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
const reports = (j: CircuitJson) =>
  analyzeSchematicPlacement(j, {
    issueTypes: ["VoltageDividerNetworkNotGrouped"],
  }).getIssues()
const move = (j: CircuitJson, name: string, dx: number, dy: number) => {
  const b = box(j, name)
  b.center.x += dx
  b.center.y += dy
  for (const p of j)
    if (
      p.type === "schematic_port" &&
      p.schematic_component_id === b.schematic_component_id
    ) {
      p.center.x += dx
      p.center.y += dy
    }
}
test("filtered divider grouping requires explicit topology and tolerates compact arrangements", async () => {
  const before = await createPocketAudioFilteredDivider("oriented"),
    after = await createPocketAudioFilteredDivider("after"),
    saved = JSON.stringify(before)
  expect(reports(before)).toHaveLength(1)
  expect(reports(after)).toEqual([])
  expect(reports([])).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  const analysis = analyzeSchematicPlacement(before)
  expect(analysis.getIssueCounts().VoltageDividerNetworkNotGrouped).toBe(1)
  expect(analysis.toString()).toContain(
    '<VoltageDividerNetworkNotGrouped supplyResistorName="R_BAT_TOP"',
  )
  expect(
    getRelevantPlacementsForIssues({
      issues: reports(before),
      componentPlacements: analysis
        .getLineItems()
        .filter((i) => i.lineItemType === "SchematicBoxPlacement"),
      circuitJson: before,
    }),
  ).toHaveLength(3)
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "GND"
      e.port_hints = ["VCC"]
    }
  }
  expect(reports(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(reports(j)).toEqual([])
  }
  for (const name of ["R_BAT_TOP", "R_BAT_BOT", "C_ADC_BAT"])
    for (const kind of [
      "scope",
      "sheet",
      "source-scope",
      "duplicate",
      "size",
      "position",
      "dnp",
    ] as const)
      reject((j) => {
        const b = box(j, name),
          c = j.find(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === b.source_component_id,
          )!
        if (kind === "scope") b.schematic_group_id = "different"
        if (kind === "sheet") b.schematic_sheet_id = "different"
        if (kind === "source-scope" && c.type === "source_component")
          c.source_group_id = "different"
        if (kind === "duplicate")
          j.push({ ...b, schematic_component_id: "duplicate" })
        if (kind === "size") b.size.width = NaN
        if (kind === "position") b.center.x = Infinity
        if (kind === "dnp")
          j.push(
            pcb_component.parse({
              type: "pcb_component",
              pcb_component_id: "dnp",
              source_component_id: b.source_component_id,
              center: { x: 0, y: 0 },
              width: 1,
              height: 1,
              rotation: 0,
              layer: "top",
              do_not_place: true,
            }),
          )
      })
  for (const name of ["R_BAT_TOP", "R_BAT_BOT", "C_ADC_BAT"])
    for (const pin of ["pin1", "pin2"])
      for (const kind of [
        "dnc",
        "missing",
        "duplicate",
        "invalid",
        "sheet",
      ] as const)
        reject((j) => {
          const p = port(j, name, pin),
            g = j.find(
              (e) =>
                e.type === "schematic_port" &&
                e.source_port_id === p.source_port_id,
            )!
          if (g.type !== "schematic_port") throw new Error("Missing pin")
          if (kind === "dnc") p.do_not_connect = true
          if (kind === "missing") j.splice(j.indexOf(g), 1)
          if (kind === "duplicate")
            j.push({ ...g, schematic_port_id: "duplicate" })
          if (kind === "invalid") g.center.y = NaN
          if (kind === "sheet") g.schematic_sheet_id = "other"
        })
  reject((j) => {
    for (const e of j)
      if (e.type === "source_net") {
        delete e.is_power
        delete e.is_ground
        delete e.is_positive_voltage_source
      }
  })
  reject((j) => {
    const c = j.find(
      (e) => e.type === "source_component" && e.name === "C_ADC_BAT",
    )!
    if (c.type === "source_component" && c.ftype === "simple_capacitor")
      c.capacitance = 0
  })
  // A third resistor on the tap is a ladder, not this uniquely identified divider.
  reject((j) => {
    const p = port(j, "R_BAT_TOP", "pin2"),
      c = j.find(
        (e) => e.type === "source_component" && e.name === "R_BAT_TOP",
      )!
    if (c.type !== "source_component") throw new Error("Missing resistor")
    j.push(
      { ...c, source_component_id: "extra" },
      { ...p, source_component_id: "extra", source_port_id: "extra" },
    )
  })
  // A capacitor to a different rail is not the shunt across the lower resistor.
  reject((j) =>
    j.push({
      type: "source_trace",
      source_trace_id: "short",
      connected_source_port_ids: [
        port(j, "R_BAT_TOP", "pin1").source_port_id,
        port(j, "C_ADC_BAT", "pin2").source_port_id,
      ],
      connected_source_net_ids: [],
    }),
  )
  // Either a remote resistor OR a remote shunt capacitor must be reported.
  const capOnly = structuredClone(after)
  move(capOnly, "C_ADC_BAT", 8, 0)
  expect(reports(capOnly)).toHaveLength(1)
  const resistorOnly = structuredClone(after)
  move(resistorOnly, "R_BAT_TOP", 10, 0)
  expect(reports(resistorOnly)).toHaveLength(1)
  for (const [dx, dy] of [
    [1, 0],
    [2, 1],
    [-1, -0.5],
  ]) {
    const compact = structuredClone(after)
    move(compact, "R_BAT_TOP", dx!, dy!)
    expect(reports(compact)).toEqual([])
  }
  // Spacing is translation/rotation invariant; no mandatory vertical alignment.
  for (const source of [before, after])
    for (const turns of [0, 1, 2, 3]) {
      const j = structuredClone(source)
      for (const e of j)
        if (e.type === "schematic_component" || e.type === "schematic_port") {
          for (let n = 0; n < turns; n++)
            e.center = { x: -e.center.y, y: e.center.x }
          e.center.x += 100
          e.center.y -= 70
          if (e.type === "schematic_component" && turns % 2)
            e.size = { width: e.size.height, height: e.size.width }
        }
      expect(reports(j)).toHaveLength(source === before ? 1 : 0)
    }
})
