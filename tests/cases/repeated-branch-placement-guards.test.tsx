import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema23Status } from "../assets/nema23-status"
import { createNema23StatusCompact } from "../assets/nema23-status-compact"
import {
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("uses branch topology and geometry, tolerates offsets, and skips ambiguous evidence", async () => {
  const original = await createNema23Status()
  const originalBytes = JSON.stringify(original)
  const issueTypes = ["RepeatedBranchesStaggered"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes }).getIssues()
  expect(issues(original)).toHaveLength(1)
  expect(JSON.stringify(original)).toBe(originalBytes)

  // Renaming cannot change a finding. No pin hints, net names or part numbers are required.
  const anonymous = structuredClone(original)
  for (const [i, element] of anonymous.entries()) {
    if (element.type === "source_component") {
      element.name = `device${i}`
      delete element.manufacturer_part_number
    }
    if (element.type === "source_port") {
      element.name = `terminal${i}`
      element.port_hints = []
    }
    if (element.type === "source_net") element.name = `connection${i}`
  }
  expect(issues(anonymous)).toHaveLength(1)
  // Repeated branches can use different resistor values, e.g. RGB currents.
  for (const [i, element] of anonymous.entries())
    if (
      element.type === "source_component" &&
      element.ftype === "simple_resistor"
    )
      element.resistance += i
  expect(issues(anonymous)).toHaveLength(1)

  // Rotate/translate the analyzer input, not the electrical topology. These are
  // geometry invariance checks on TSX output, not saved Circuit JSON fixtures.
  for (const rotation of [0, 90, 180, 270]) {
    const rotated = structuredClone(anonymous)
    const radians = (rotation * Math.PI) / 180
    const rotate = ({ x, y }: { x: number; y: number }) => ({
      x: x * Math.cos(radians) - y * Math.sin(radians) + 13,
      y: x * Math.sin(radians) + y * Math.cos(radians) - 7,
    })
    const directions = ["right", "up", "left", "down"] as const
    for (const element of rotated) {
      if (element.type === "schematic_component") {
        element.center = rotate(element.center)
        if (rotation % 180)
          element.size = {
            width: element.size.height,
            height: element.size.width,
          }
      }
      if (element.type === "schematic_port") {
        element.center = rotate(element.center)
        if (element.facing_direction)
          element.facing_direction =
            directions[
              (directions.indexOf(element.facing_direction) + rotation / 90) % 4
            ]!
      }
    }
    expect(issues(rotated)).toHaveLength(1)
  }

  const aligned = await createNema23StatusCompact()
  // Modest staggering for text clearance is accepted; exact coordinate equality is unnecessary.
  const offset = structuredClone(aligned)
  for (const name of ["R_STATUS_G", "Q_STATUS_G"]) {
    const box = getReproSchematicComponent(offset, name)
    box.center.y += 0.5
    for (const element of offset)
      if (
        element.type === "schematic_port" &&
        element.schematic_component_id === box.schematic_component_id
      )
        element.center.y += 0.5
  }
  expect(issues(offset)).toEqual([])

  const mutations: Array<(json: CircuitJson) => void> = [
    (json) => {
      for (const e of json) if (e.type === "source_net") e.is_ground = false
    },
    (json) => {
      getReproSchematicComponent(json, "Q_STATUS_B").schematic_sheet_id =
        "another-sheet"
    },
    (json) => {
      getReproSchematicComponent(json, "Q_STATUS_B").schematic_group_id =
        "another-group"
    },
    (json) => {
      getReproSourcePort(json, "Q_STATUS_B", "C").requires_power = true
    },
    (json) => {
      getReproSourcePort(json, "Q_STATUS_B", "C").do_not_connect = true
    },
    (json) => {
      const port = getReproSourcePort(json, "Q_STATUS_B", "C")
      const pin = json.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === port.source_port_id,
      )!
      json.splice(json.indexOf(pin), 1)
    },
    (json) => {
      const port = getReproSourcePort(json, "Q_STATUS_B", "C")
      const pin = json.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === port.source_port_id,
      )!
      if (pin.type === "schematic_port")
        json.push({ ...pin, schematic_port_id: "duplicate" })
    },
    (json) => {
      const port = getReproSourcePort(json, "Q_STATUS_B", "C")
      json.push({
        ...port,
        source_port_id: "extra-fanout",
        source_component_id: "other-device",
      })
    },
    (json) => {
      const port = getReproSourcePort(json, "Q_STATUS_B", "C")
      const pin = json.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === port.source_port_id,
      )!
      if (pin.type === "schematic_port") pin.center.x = Number.NaN
    },
  ]
  for (const mutate of mutations) {
    const json = structuredClone(original)
    mutate(json)
    expect(issues(json)).toEqual([])
  }
})
