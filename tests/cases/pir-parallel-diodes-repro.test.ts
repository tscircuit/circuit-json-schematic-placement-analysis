import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import {
  createPirParallelDiodes,
  pirDiodePlacements,
} from "../assets/pir-parallel-diodes"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the published PIR diode pair with shared nets at opposite ends", async () => {
  const circuitJson = await createPirParallelDiodes()
  expectReproRendered(circuitJson, 2)
  expectReproNets(circuitJson, [
    ["net.AINV", "D4.pin2", "D5.pin1"],
    ["net.AOUT", "D4.pin1", "D5.pin2"],
  ])
  expect(circuitJson.filter((e) => e.type === "source_port")).toHaveLength(4)
  for (const [name, [x, y]] of Object.entries(pirDiodePlacements)) {
    const part = getReproSchematicComponent(circuitJson, name)
    expect(part.center.x).toBeCloseTo(x, 6)
    expect(part.center.y).toBeCloseTo(y, 6)
    expect(part.symbol_name).toBe("diode_right")
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "ParallelDiodesNotAligned",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1000,
      height: 800,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
