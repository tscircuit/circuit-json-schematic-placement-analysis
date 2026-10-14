import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createMicroSdParallelCapacitorRepro } from "../assets/microsd-parallel-capacitors"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("places the parallel microSD capacitors beside each other without changing symbols or connections", async () => {
  const before = await createMicroSdParallelCapacitorRepro()
  const pairOnly = await createMicroSdParallelCapacitorRepro({
    C_SD_HF: { schX: -4.2, schY: -2.7, schRotation: 270 },
    C_SD_BULK: { schX: -2.6, schY: -2.7, schRotation: 270 },
  })
  const after = await createMicroSdParallelCapacitorRepro({
    C_SD_HF: { schX: -4.2, schY: -2.7, schRotation: 270 },
    C_SD_BULK: { schX: -2.6, schY: -2.7, schRotation: 270 },
    // Clear the pre-existing resistor-label overlap with the connector and
    // keep the clock test point with the other signals in the full-sheet view.
    R_SD_DAT0_PU: { schX: -3.2, schY: -0.3, schRotation: 90 },
    TP_SD_CLK: { schX: -5.39375, schY: -1.5, schRotation: 180 },
  })
  for (const json of [before, pairOnly, after]) expectReproRendered(json, 16)
  const electrical = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_trace",
        "source_net",
        "source_group",
        "source_bus",
        "source_component_internal_connection",
      ].includes(e.type),
    )
  expect(electrical(after)).toEqual(electrical(before))
  expect(electrical(pairOnly)).toEqual(electrical(before))
  const changed: string[] = []
  for (const component of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(before, component.name!)
    const corrected = getReproSchematicComponent(after, component.name!)
    expect(corrected).toEqual({ ...original, center: corrected.center })
    if (
      original.center.x !== corrected.center.x ||
      original.center.y !== corrected.center.y
    )
      changed.push(component.name!)
  }
  expect(changed.sort()).toEqual([
    "C_SD_BULK",
    "C_SD_HF",
    "R_SD_DAT0_PU",
    "TP_SD_CLK",
  ])
  const pinGeometry = (json: CircuitJson) =>
    json
      .filter((e) => e.type === "schematic_port")
      // is_connected describes a drawn wire versus an auto label; source
      // records above establish electrical connectivity independently of routing.
      .map(({ center, is_connected, ...port }) => {
        const box = json.find(
          (e) =>
            e.type === "schematic_component" &&
            e.schematic_component_id === port.schematic_component_id,
        )
        if (box?.type !== "schematic_component")
          throw new Error("Missing symbol")
        return {
          ...port,
          x: +(center.x - box.center.x).toFixed(6),
          y: +(center.y - box.center.y).toFixed(6),
        }
      })
  expect(pinGeometry(after)).toEqual(pinGeometry(before))
  expect(pinGeometry(pairOnly)).toEqual(pinGeometry(before))
  for (const component of before.filter((e) => e.type === "source_component")) {
    const original = getReproSchematicComponent(before, component.name!)
    const next = getReproSchematicComponent(pairOnly, component.name!)
    expect(next).toEqual({
      ...original,
      center: ["C_SD_HF", "C_SD_BULK"].includes(component.name!)
        ? getReproSchematicComponent(after, component.name!).center
        : original.center,
    })
  }
  const baseline = analyzeSchematicPlacement(before)
  const analysis = analyzeSchematicPlacement(after)
  const pairAnalysis = analyzeSchematicPlacement(pairOnly)
  const issues = baseline.getIssues()
  expect(issues.map((issue) => issue.lineItemType)).toEqual([
    "ParallelCapacitorsDrawnInline",
  ])
  expect(analysis.getIssues()).toEqual([])
  expect(pairAnalysis.getIssues()).toEqual([])

  // Both pairs of terminals must have continuous local wires, not only net labels.
  const capacitors = ["C_SD_HF", "C_SD_BULK"].map((name) =>
    getReproSchematicComponent(after, name),
  )
  for (const pin of [1, 2]) {
    const points = capacitors.map((box) => {
      const port = after.find(
        (e) =>
          e.type === "schematic_port" &&
          e.schematic_component_id === box.schematic_component_id &&
          e.pin_number === pin,
      )
      if (port?.type !== "schematic_port")
        throw new Error("Missing capacitor port")
      return port.center
    })
    const key = (p: { x: number; y: number }) =>
      `${p.x.toFixed(6)},${p.y.toFixed(6)}`
    const edges = after.flatMap((e) =>
      e.type === "schematic_trace" ? e.edges : [],
    )
    const reached = new Set([key(points[0]!)])
    let size = -1
    while (size !== reached.size) {
      size = reached.size
      for (const edge of edges) {
        if (reached.has(key(edge.from))) reached.add(key(edge.to))
        if (reached.has(key(edge.to))) reached.add(key(edge.from))
      }
    }
    expect(reached.has(key(points[1]!))).toBe(true)
  }
  expect(
    createPlacementComparisonSvg({
      subject: "parallel capacitor pair",
      padding: { top: 0.6 },
      before: { circuitJson: before, analysis: baseline },
      after: { circuitJson: pairOnly, analysis: pairAnalysis },
      issues,
      beforeDiagnostic: () =>
        "C_SD_HF / C_SD_BULK: parallel capacitors drawn end-to-end.",
      afterDiagnostic:
        "Parallel branches beside one another.\nContinuous shared wires; full analysis: 0 findings.",
      note: "Only the two capacitors move in this comparison; symbols and electrical connections are preserved.",
    }),
  ).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    createIssueReproSnapshot({
      circuitJson: after,
      analysis,
      width: 1600,
      height: 1100,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
