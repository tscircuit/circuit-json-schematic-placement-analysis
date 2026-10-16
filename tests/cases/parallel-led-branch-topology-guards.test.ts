import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { renderParallelLedBranches } from "../fixtures/parallel-led-branches"
const issueTypes = ["ParallelLedBranchesDrawnInline"] as const
const issues = (json: CircuitJson) =>
  analyzeSchematicPlacement(json, { issueTypes }).getIssues()

test("requires a complete local parallel LED bank with private resistor junctions and sufficient metadata", async () => {
  for (const topology of [
    "shared-rails",
    "separate-returns",
    "tapped-junction",
    "tapped-return",
    "zero-ohm",
    "different-group",
    "shorted",
  ] as const) {
    const json = await renderParallelLedBranches({ topology })
    expect(
      json.filter((e) => e.type.endsWith("_error")),
      topology,
    ).toEqual([])
    expect(issues(json), topology).toEqual([])
  }
  expect(issues(await renderParallelLedBranches({ count: 2 }))).toEqual([])
  expect(issues([])).toEqual([])
  const json = await renderParallelLedBranches()
  expect(issues(json)).toHaveLength(1)
  for (const invalid of [
    "missing-port",
    "duplicate-port",
    "missing-placement",
    "duplicate-placement",
    "different-sheet",
    "wrong-port-sheet",
    "unsupported-type",
    "dnp",
    "do-not-connect",
    "nonfinite",
    "source-ground-flag",
  ] as const) {
    const altered = structuredClone(json)
    const source = altered.find(
      (e) => e.type === "source_component" && e.ftype === "simple_led",
    )!
    if (source.type !== "source_component") throw new Error("Missing LED")
    const p = altered.find(
      (e) =>
        e.type === "source_port" &&
        e.source_component_id === source.source_component_id,
    )!
    const box = altered.find(
      (e) =>
        e.type === "schematic_component" &&
        e.source_component_id === source.source_component_id,
    )!
    if (p.type !== "source_port" || box.type !== "schematic_component")
      throw new Error("Missing geometry")
    const pin = altered.find(
      (e) =>
        e.type === "schematic_port" && e.source_port_id === p.source_port_id,
    )!
    if (pin.type !== "schematic_port") throw new Error("Missing pin")
    if (invalid === "missing-port") altered.splice(altered.indexOf(pin), 1)
    if (invalid === "duplicate-port")
      altered.push({ ...pin, schematic_port_id: "duplicate" })
    if (invalid === "missing-placement") altered.splice(altered.indexOf(box), 1)
    if (invalid === "duplicate-placement")
      altered.push({ ...box, schematic_component_id: "duplicate" })
    if (invalid === "different-sheet") box.schematic_sheet_id = "other"
    if (invalid === "wrong-port-sheet") pin.schematic_sheet_id = "other"
    if (invalid === "unsupported-type")
      Object.assign(source, { ftype: "simple_chip" })
    if (invalid === "do-not-connect") p.do_not_connect = true
    if (invalid === "nonfinite") pin.center.x = Number.NaN
    if (invalid === "source-ground-flag") {
      const endpoint = altered.find(
        (e) => e.type === "source_component" && e.ftype === "simple_chip",
      )!
      if (endpoint.type !== "source_component") throw new Error("Missing host")
      const port = altered.find(
        (e) =>
          e.type === "source_port" &&
          e.source_component_id === endpoint.source_component_id,
      )!
      if (port.type !== "source_port") throw new Error("Missing host port")
      port.requires_ground = true
    }
    if (invalid === "dnp")
      altered.push({
        type: "pcb_component",
        pcb_component_id: "unpopulated",
        source_component_id: source.source_component_id,
        center: { x: 0, y: 0 },
        width: 1,
        height: 1,
        rotation: 0,
        layer: "top",
        do_not_place: true,
        obstructs_within_bounds: true,
      })
    expect(issues(altered), invalid).toEqual([])
  }
})
