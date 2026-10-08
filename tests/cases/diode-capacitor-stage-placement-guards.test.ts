import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createEreaderDisplay } from "../assets/ereader-diode-capacitor-stage"
import {
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

test("diode-capacitor grouping uses typed topology and skips ambiguous or incomplete evidence", async () => {
  const before = await createEreaderDisplay()
  const issueTypes = ["DiodeCapacitorJunctionTooSpreadOut"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes: [...issueTypes] }).getIssues()
  const baseline = issues(before)
  expect(baseline).toHaveLength(1)
  const unchanged = JSON.stringify(before)
  expect(analyzeSchematicPlacement(before).getIssues({ issueTypes })).toEqual(
    baseline,
  )
  expect(
    analyzeSchematicPlacement(before).getIssues({
      issueTypes,
      schematicSheetId: "other",
    }),
  ).toEqual([])
  expect(JSON.stringify(before)).toBe(unchanged)

  const renamed = structuredClone(before)
  for (const e of renamed) {
    if (e.type === "source_component") {
      e.name = "unrelated"
      delete e.manufacturer_part_number
      delete e.supplier_part_numbers
    }
    if (e.type === "source_port") {
      e.name = "unknown"
      e.port_hints = []
    }
    if (e.type === "source_net") e.name = "unnamed"
    if (e.type === "schematic_net_label") e.text = "unrelated"
  }
  const renamedIssues = issues(renamed)
  expect(renamedIssues).toHaveLength(1)
  const renamedIssue = renamedIssues[0]!
  const originalIssue = baseline[0]!
  if (
    renamedIssue.lineItemType !== "DiodeCapacitorJunctionTooSpreadOut" ||
    originalIssue.lineItemType !== "DiodeCapacitorJunctionTooSpreadOut"
  )
    throw new Error("Wrong issue")
  expect(renamedIssue.capacitorSchematicBox.sourceComponentId).toBe(
    originalIssue.capacitorSchematicBox.sourceComponentId,
  )
  expect(
    renamedIssue.diodeSchematicBoxes.map((p) => p.sourceComponentId),
  ).toEqual(originalIssue.diodeSchematicBoxes.map((p) => p.sourceComponentId))
  expect(renamedIssue.maxJunctionPinDistance).toBe(
    originalIssue.maxJunctionPinDistance,
  )

  for (const angle of [90, 180, 270]) {
    const rotated = structuredClone(before)
    const radians = (angle * Math.PI) / 180
    for (const e of rotated) {
      if (e.type !== "schematic_component" && e.type !== "schematic_port")
        continue
      const { x, y } = e.center
      e.center = {
        x: 30 + x * Math.cos(radians) - y * Math.sin(radians),
        y: -10 + x * Math.sin(radians) + y * Math.cos(radians),
      }
    }
    const result = issues(rotated)[0]!
    expect(result?.lineItemType).toBe("DiodeCapacitorJunctionTooSpreadOut")
    if (result.lineItemType === "DiodeCapacitorJunctionTooSpreadOut")
      expect(result.maxJunctionPinDistance).toBeCloseTo(
        originalIssue.maxJunctionPinDistance,
        8,
      )
  }
  const removeBank = (json: CircuitJson) => {
    const ids = new Set(
      json
        .filter(
          (e) =>
            e.type === "source_component" && ["C23", "C32"].includes(e.name!),
        )
        .map((e) =>
          e.type === "source_component" ? e.source_component_id : "",
        ),
    )
    return json.filter(
      (e) => e.type !== "source_component" || !ids.has(e.source_component_id),
    )
  }
  expect(issues(removeBank(before))).toEqual([])
  for (const flag of ["requires_ground", "provides_ground"] as const) {
    const explicitPortGround = structuredClone(before)
    for (const e of explicitPortGround) {
      if (e.type === "source_net") e.is_ground = false
      if (e.type === "source_port") {
        e.requires_ground = false
        e.provides_ground = false
      }
    }
    getReproSourcePort(explicitPortGround, "D3", "cathode")[flag] = true
    expect(issues(explicitPortGround)).toHaveLength(1)
  }
  const guards: Record<string, (json: CircuitJson) => void> = {
    "names do not establish ground": (json) => {
      for (const e of json) {
        if (e.type === "source_net") e.is_ground = false
        if (e.type === "source_port") {
          e.requires_ground = false
          e.provides_ground = false
        }
      }
    },
    "extra junction branch": (json) => {
      const p = getReproSourcePort(json, "C16", "pin1")
      json.push({ ...p, source_port_id: "extra-port" })
      json.push({
        type: "source_trace",
        source_trace_id: "extra-branch",
        connected_source_port_ids: [p.source_port_id, "extra-port"],
        connected_source_net_ids: [],
      })
    },
    "shorted diode": (json) => {
      json.push({
        type: "source_trace",
        source_trace_id: "short",
        connected_source_port_ids: [
          getReproSourcePort(json, "D2", "anode").source_port_id,
          getReproSourcePort(json, "D2", "cathode").source_port_id,
        ],
        connected_source_net_ids: [],
      })
    },
    "different sheet": (json) => {
      getReproSchematicComponent(json, "D2").schematic_sheet_id = "other"
    },
    "different group": (json) => {
      getReproSchematicComponent(json, "D3").schematic_group_id = "other"
    },
    "bank on another sheet": (json) => {
      getReproSchematicComponent(json, "C23").schematic_sheet_id = "other"
    },
    "duplicate placement": (json) => {
      json.push({
        ...getReproSchematicComponent(json, "D2"),
        schematic_component_id: "duplicate",
      })
    },
    "disconnected pin": (json) => {
      getReproSourcePort(json, "D2", "cathode").do_not_connect = true
    },
    "missing pin geometry": (json) => {
      const id = getReproSourcePort(json, "C16", "pin1").source_port_id
      json.splice(
        json.findIndex(
          (e) => e.type === "schematic_port" && e.source_port_id === id,
        ),
        1,
      )
    },
    "zero capacitance": (json) => {
      for (const e of json)
        if (
          e.type === "source_component" &&
          e.ftype === "simple_capacitor" &&
          e.name === "C16"
        )
          e.capacitance = 0
    },
    "unknown diode type": (json) => {
      const i = json.findIndex(
        (e) => e.type === "source_component" && e.name === "D2",
      )
      const e = json[i]!
      if (e.type === "source_component")
        json[i] = {
          type: "source_component",
          ftype: "simple_chip",
          source_component_id: e.source_component_id,
          name: e.name,
        }
    },
    "large symbol spacing allowance": (json) => {
      getReproSchematicComponent(json, "C16").size = { width: 3, height: 3 }
    },
    "unpopulated diode": (json) => {
      json.push({
        type: "pcb_component",
        pcb_component_id: "unpopulated",
        source_component_id: getReproSourcePort(json, "D2", "cathode")
          .source_component_id!,
        center: { x: 0, y: 0 },
        width: 1,
        height: 1,
        layer: "top",
        rotation: 0,
        do_not_place: true,
        obstructs_within_bounds: true,
      })
    },
  }
  for (const [name, mutate] of Object.entries(guards)) {
    const json = structuredClone(before)
    mutate(json)
    expect(issues(json), name).toEqual([])
  }
})
