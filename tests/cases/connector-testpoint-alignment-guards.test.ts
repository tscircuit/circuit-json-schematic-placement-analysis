import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createMicroSdConnectorTestPoint } from "../assets/microsd-connector-testpoint"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
const reports = (j: CircuitJson) =>
  analyzeSchematicPlacement(j, {
    issueTypes: ["ConnectorTestPointNotAligned"],
  }).getIssues()
test("connector-testpoint-alignment uses typed topology and skips ambiguous geometry", async () => {
  const before = await createMicroSdConnectorTestPoint(),
    after = await createMicroSdConnectorTestPoint(true),
    saved = JSON.stringify(before)
  expect(reports(before)).toHaveLength(1)
  expect(reports(after)).toEqual([])
  expect(reports([])).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()
      .ConnectorTestPointNotAligned,
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<ConnectorTestPointNotAligned ",
  )
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "arbitrary"
    if (e.type === "source_port") {
      e.name = "GND"
      e.port_hints = ["VCC"]
      e.pin_number = 99
    }
  }
  expect(reports(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(reports(j)).toEqual([])
  }
  for (const kind of [
    "sheet",
    "group",
    "size",
    "position",
    "duplicate",
    "dnp",
    "type",
  ] as const)
    reject((j) => {
      const b = box(j, "J_SD")
      if (kind === "sheet") b.schematic_sheet_id = "other"
      if (kind === "group") b.schematic_group_id = "other"
      if (kind === "size") b.size.width = NaN
      if (kind === "position") b.center.x = Infinity
      if (kind === "duplicate")
        j.push({ ...b, schematic_component_id: "duplicate" })
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
      if (kind === "type")
        Object.assign(
          j.find(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === b.source_component_id,
          )!,
          { ftype: "simple_chip" },
        )
    })
  for (const kind of [
    "dnc",
    "missing",
    "duplicate",
    "position",
    "facing",
  ] as const)
    reject((j) => {
      const p = port(j, "J_SD", "pin5")
      const g = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )!
      if (g.type !== "schematic_port") throw new Error("missing geometry")
      if (kind === "dnc") p.do_not_connect = true
      if (kind === "missing") j.splice(j.indexOf(g), 1)
      if (kind === "duplicate") j.push({ ...g, schematic_port_id: "duplicate" })
      if (kind === "position") g.center.y = NaN
      if (kind === "facing") delete g.facing_direction
    })
  for (const kind of [
    "sheet",
    "group",
    "size",
    "position",
    "duplicate",
    "dnp",
    "type",
  ] as const)
    reject((j) => {
      const b = box(j, "TP_SD_CLK")
      if (kind === "sheet") b.schematic_sheet_id = "other"
      if (kind === "group") b.schematic_group_id = "other"
      if (kind === "size") b.size.width = NaN
      if (kind === "position") b.center.x = Infinity
      if (kind === "duplicate")
        j.push({ ...b, schematic_component_id: "duplicate" })
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
      if (kind === "type")
        Object.assign(
          j.find(
            (e) =>
              e.type === "source_component" &&
              e.source_component_id === b.source_component_id,
          )!,
          { ftype: "simple_chip" },
        )
    })
  for (const kind of [
    "dnc",
    "missing",
    "duplicate",
    "position",
    "facing",
  ] as const)
    reject((j) => {
      const p = port(j, "TP_SD_CLK", "pin1")
      const g = j.find(
        (e) =>
          e.type === "schematic_port" && e.source_port_id === p.source_port_id,
      )!
      if (g.type !== "schematic_port") throw new Error("missing geometry")
      if (kind === "dnc") p.do_not_connect = true
      if (kind === "missing") j.splice(j.indexOf(g), 1)
      if (kind === "duplicate") j.push({ ...g, schematic_port_id: "duplicate" })
      if (kind === "position") g.center.y = NaN
      if (kind === "facing") delete g.facing_direction
    })
  for (const source of [before, after])
    for (const turns of [0, 1, 2, 3])
      for (const reflect of [false, true]) {
        const j = structuredClone(source),
          directions = ["right", "up", "left", "down"] as const
        for (const e of j) {
          if (e.type !== "schematic_component" && e.type !== "schematic_port")
            continue
          for (let n = 0; n < turns; n++)
            e.center = { x: -e.center.y, y: e.center.x }
          if (reflect) e.center.x = -e.center.x
          e.center.x += 20
          e.center.y -= 10
          if (e.type === "schematic_component" && turns % 2)
            e.size = { width: e.size.height, height: e.size.width }
          if (e.type === "schematic_port" && e.facing_direction) {
            e.facing_direction =
              directions[(directions.indexOf(e.facing_direction) + turns) % 4]!
            if (
              reflect &&
              (e.facing_direction === "left" || e.facing_direction === "right")
            )
              e.facing_direction =
                e.facing_direction === "left" ? "right" : "left"
          }
        }
        expect(reports(j)).toHaveLength(source === before ? 1 : 0)
      }
  for (const flag of [
    "requires_power",
    "provides_power",
    "requires_ground",
    "provides_ground",
  ] as const)
    reject((j) => {
      port(j, "TP_SD_CLK", "pin1")[flag] = true
    })
  reject((j) => {
    const p = port(j, "TP_SD_CLK", "pin1")
    j.push(
      { ...p, source_port_id: "extra" },
      {
        type: "source_trace",
        source_trace_id: "extra-trace",
        connected_source_port_ids: [p.source_port_id, "extra"],
        connected_source_net_ids: [],
      },
    )
  })
  reject((j) => {
    const n = j.find((e) => e.type === "source_net" && e.name === "SD_CLK")
    if (n?.type !== "source_net") throw new Error("missing net")
    n.is_power = true
  })
  const header = structuredClone(before)
  Object.assign(
    header.find((e) => e.type === "source_component" && e.name === "J_SD")!,
    { ftype: "simple_pin_header" },
  )
  expect(reports(header)).toHaveLength(1)
  const move = (j: CircuitJson, dx: number, dy: number) => {
    const b = box(j, "TP_SD_CLK")
    b.center.x += dx
    b.center.y += dy
    for (const e of j)
      if (
        e.type === "schematic_port" &&
        e.schematic_component_id === b.schematic_component_id
      ) {
        e.center.x += dx
        e.center.y += dy
      }
  }
  const long = structuredClone(after)
  move(long, -8, 0)
  expect(reports(long)).toEqual([])
  // At a long distance, a visible stagger is reported; a sub-tolerance stagger is accepted.
  for (const offset of [0.14, 0.16]) {
    const j = structuredClone(long)
    move(j, 0, offset)
    expect(reports(j)).toHaveLength(offset < 0.15 ? 0 : 1)
  }
  const compact = structuredClone(before)
  const b = box(compact, "TP_SD_CLK")
  move(compact, -1.8 - b.center.x, -0.4 - b.center.y)
  expect(reports(compact)).toEqual([])
})
