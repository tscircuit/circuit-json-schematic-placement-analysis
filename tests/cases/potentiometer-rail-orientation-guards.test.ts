import { expect, test } from "bun:test"
import { pcb_component, type CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createMq135Potentiometer } from "../assets/mq135-potentiometer"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"

test("potentiometer orientation requires explicit, unambiguous rails and valid three-terminal geometry", async () => {
  const before = await createMq135Potentiometer(),
    after = await createMq135Potentiometer(true)
  const saved = JSON.stringify(before)
  const issues = (j: CircuitJson) =>
    analyzeSchematicPlacement(j, {
      issueTypes: ["PotentiometerHasIncorrectRailOrientation"],
    }).getIssues()
  expect(issues(before)).toHaveLength(1)
  expect(issues(after)).toEqual([])
  expect(JSON.stringify(before)).toBe(saved)
  expect(
    analyzeSchematicPlacement(before).getIssueCounts()
      .PotentiometerHasIncorrectRailOrientation,
  ).toBe(1)
  expect(analyzeSchematicPlacement(before).toString()).toContain(
    "<PotentiometerHasIncorrectRailOrientation ",
  )
  expect(
    analyzeSchematicPlacement(before, { issueTypes: [] }).getIssues(),
  ).toEqual([])
  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") e.name = "X"
    if (e.type === "source_port") {
      e.name = "unrelated"
      e.port_hints = ["GND", "VCC"]
      e.pin_number = 99
    }
    if (e.type === "source_net") e.name = "unrelated"
    if (e.type === "schematic_net_label") e.text = "unrelated"
  }
  expect(issues(renamed)).toHaveLength(1)
  const reject = (edit: (j: CircuitJson) => void) => {
    const j = structuredClone(before)
    edit(j)
    expect(issues(j)).toEqual([])
  }
  reject((j) => {
    for (const e of j)
      if (e.type === "source_net") delete e.is_positive_voltage_source
  })
  reject((j) => {
    port(j, "RV1", "pin2").requires_power = true
  })
  reject((j) => {
    port(j, "RV1", "pin1").requires_ground = true
  })
  reject((j) => {
    j.push({
      type: "source_trace",
      source_trace_id: "short",
      connected_source_port_ids: [
        port(j, "RV1", "pin2").source_port_id,
        port(j, "RV1", "pin3").source_port_id,
      ],
      connected_source_net_ids: [],
    })
  })
  reject((j) => {
    const c = j.find((e) => e.type === "source_component")!
    Object.assign(c, { ftype: "simple_chip" })
  })
  reject((j) => {
    const c = j.find((e) => e.type === "source_component")!
    Object.assign(c, { max_resistance: 0 })
  })
  reject((j) => {
    box(j, "RV1").schematic_sheet_id = "different"
  })
  reject((j) => {
    box(j, "RV1").size.width = NaN
  })
  reject((j) => {
    j.push({ ...box(j, "RV1"), schematic_component_id: "duplicate" })
  })
  reject((j) => {
    j.push(
      pcb_component.parse({
        type: "pcb_component",
        pcb_component_id: "dnp",
        source_component_id: box(j, "RV1").source_component_id,
        center: { x: 0, y: 0 },
        width: 1,
        height: 1,
        rotation: 0,
        layer: "top",
        do_not_place: true,
      }),
    )
  })
  for (const pin of ["pin1", "pin2", "pin3"]) {
    reject((j) => {
      port(j, "RV1", pin).do_not_connect = true
    })
    reject((j) => {
      const id = port(j, "RV1", pin).source_port_id
      j.splice(
        j.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    })
    reject((j) => {
      const id = port(j, "RV1", pin).source_port_id
      const p = j.find(
        (e) => e.type === "schematic_port" && e.source_port_id === id,
      )!
      j.push({ ...p, schematic_port_id: "duplicate" } as typeof p)
    })
    reject((j) => {
      const id = port(j, "RV1", pin).source_port_id
      for (const e of j)
        if (e.type === "schematic_port" && e.source_port_id === id)
          delete e.facing_direction
    })
  }
  // The absolute rail direction matters; positions and arbitrary port numbering do not.
  for (const turns of [0, 1, 2, 3]) {
    const j = structuredClone(after),
      directions = ["right", "up", "left", "down"] as const
    for (const e of j) {
      if (e.type !== "schematic_port" && e.type !== "schematic_component")
        continue
      for (let n = 0; n < turns; n++)
        e.center = { x: -e.center.y, y: e.center.x }
      e.center.x += 30
      e.center.y -= 20
      if (e.type === "schematic_component" && turns % 2)
        e.size = { width: e.size.height, height: e.size.width }
      if (e.type === "schematic_port" && e.facing_direction)
        e.facing_direction =
          directions[(directions.indexOf(e.facing_direction) + turns) % 4]!
    }
    const result = issues(j)
    expect(result).toHaveLength(turns === 0 ? 0 : 1)
    if (turns)
      expect(result[0]).toMatchObject({ deltaSchRotation: 360 - turns * 90 })
  }
})
