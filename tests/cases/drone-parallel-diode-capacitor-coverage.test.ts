import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDroneParallelDiodeCapacitorRepro } from "../assets/drone-parallel-diode-capacitors"
import { dronePlacements } from "../fixtures/drone-parallel-diode-capacitor-layout"

test("retains four new pair findings after every existing finding is corrected", async () => {
  const json = await createDroneParallelDiodeCapacitorRepro(
    dronePlacements(false),
  )
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual(
    Array(4).fill("ParallelDiodeCapacitorNotAligned"),
  )
  for (const e of json) {
    if (e.type === "source_component" || e.type === "source_net")
      e.name = "anonymous"
    if (e.type === "source_port") {
      e.name = "anonymous"
      e.port_hints = []
    }
    if (e.type === "schematic_net_label") e.text = "anonymous"
  }
  expect(
    analyzeSchematicPlacement(json, {
      issueTypes: ["ParallelDiodeCapacitorNotAligned"],
    }).getIssues(),
  ).toHaveLength(4)
})
