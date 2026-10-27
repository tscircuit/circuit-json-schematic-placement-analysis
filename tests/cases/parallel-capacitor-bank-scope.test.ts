import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema8CapacitorBank } from "../assets/nema8-capacitor-bank"
import {
  getReproSchematicComponent as box,
  getReproSourcePort as port,
} from "../fixtures/placement-repro-assertions"
const issues = (j: CircuitJson) =>
  analyzeSchematicPlacement(j, {
    issueTypes: ["ParallelCapacitorsDrawnInline"],
  }).getIssues()
test("checks local neighboring pairs even when the same bank spans other sheets and distant blocks", async () => {
  const before = await createNema8CapacitorBank(),
    after = await createNema8CapacitorBank(true)
  expect(issues(before)).toHaveLength(3)
  expect(issues(after)).toEqual([])
  const names = ["C_MCU_HF", "C_MCU_BULK", "C_TEMP", "C_STATUS"]
  const addRemote = (j: CircuitJson, differentSheet: boolean) => {
    for (const name of names) {
      const b = box(j, name),
        c = j.find(
          (e) =>
            e.type === "source_component" &&
            e.source_component_id === b.source_component_id,
        )!
      if (c.type !== "source_component") throw new Error("Missing component")
      const id = c.source_component_id + "-remote",
        sid = b.schematic_component_id + "-remote"
      j.push(
        { ...c, source_component_id: id },
        {
          ...b,
          source_component_id: id,
          schematic_component_id: sid,
          center: { x: b.center.x + 30, y: b.center.y },
          schematic_sheet_id: differentSheet ? "remote" : b.schematic_sheet_id,
        },
      )
      for (const number of ["pin1", "pin2"]) {
        const p = port(j, name, number),
          g = j.find(
            (e) =>
              e.type === "schematic_port" &&
              e.source_port_id === p.source_port_id,
          )!
        if (g.type !== "schematic_port") throw new Error("Missing pin")
        j.push(
          {
            ...p,
            source_component_id: id,
            source_port_id: p.source_port_id + "-remote",
          },
          {
            ...g,
            source_port_id: p.source_port_id + "-remote",
            schematic_component_id: sid,
            schematic_port_id: g.schematic_port_id + "-remote",
            center: { x: g.center.x + 30, y: g.center.y },
            schematic_sheet_id: differentSheet
              ? "remote"
              : g.schematic_sheet_id,
          },
          {
            type: "source_trace",
            source_trace_id: p.source_port_id + "-remote",
            connected_source_port_ids: [
              p.source_port_id,
              p.source_port_id + "-remote",
            ],
            connected_source_net_ids: [],
          },
        )
      }
    }
  }
  for (const differentSheet of [false, true]) {
    const j = structuredClone(before)
    addRemote(j, differentSheet)
    const found = issues(j)
    expect(found).toHaveLength(6)
    for (const i of found) {
      if (i.lineItemType !== "ParallelCapacitorsDrawnInline")
        throw new Error("Wrong issue")
      expect(
        Math.abs(
          i.firstCapacitorSchematicBox.schX -
            i.secondCapacitorSchematicBox.schX,
        ),
      ).toBeLessThan(1)
      expect(i.firstCapacitorSchematicBox.schematicSheetId).toBe(
        i.secondCapacitorSchematicBox.schematicSheetId,
      )
    }
  }
  // A different group on the same supply must never be paired with this block.
  const separate = structuredClone(before)
  box(separate, "C_MCU_BULK").schematic_group_id = "other"
  expect(issues(separate)).toHaveLength(1)
  // One malformed capacitor does not hide the other valid adjacent pair.
  const invalid = structuredClone(before)
  box(invalid, "C_MCU_BULK").size.width = NaN
  expect(issues(invalid)).toHaveLength(1)
  // Supplying explicit power metadata does not introduce a grouping error in the correction.
  const powered = structuredClone(after)
  for (const e of powered)
    if (e.type === "source_net" && e.name === "VIO") e.is_power = true
  expect(analyzeSchematicPlacement(powered).getIssues()).toEqual([])
})
