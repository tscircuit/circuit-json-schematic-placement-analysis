import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createDroneParallelDiodeCapacitorRepro } from "../assets/drone-parallel-diode-capacitors"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces all four parallel diode/capacitor branches on the complete drone schematic", async () => {
  const circuitJson = await createDroneParallelDiodeCapacitorRepro()
  expectReproRendered(circuitJson, 58)
  expectReproNets(circuitJson, [
    [
      "net.VBAT",
      ...[1, 2, 3, 4].flatMap((n) => [
        `D${n}.pin1`,
        `CM${n}.pin1`,
        `M${n}_POS.pin1`,
      ]),
    ],
    ...[1, 2, 3, 4].map((n) => [
      `net.M${n}_NEG`,
      `D${n}.pin2`,
      `CM${n}.pin2`,
      `Q${n}.pin3`,
      `M${n}_NEG.pin1`,
    ]),
  ])
  for (let n = 1; n <= 4; n++) {
    const ox = -20 + (n - 1) * 20
    expect(getReproSchematicComponent(circuitJson, `D${n}`).center).toEqual({
      x: ox + 4,
      y: -32,
    })
    expect(getReproSchematicComponent(circuitJson, `CM${n}`).center).toEqual({
      x: ox + 7,
      y: -35,
    })
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((issue) => issue.lineItemType)).toEqual([
    ...Array(4).fill("ParallelDiodeCapacitorNotAligned"),
    "DecouplingCapacitorsNotCloseTogether",
    "DecouplingCapacitorsNotCloseTogether",
    "RailPathTooSpreadOut",
    "RailPathTooSpreadOut",
    "InductorSeparatedFromChipPins",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1800,
      height: 1200,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
