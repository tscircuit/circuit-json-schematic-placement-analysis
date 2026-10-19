import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createDroneParallelDiodeCapacitorRepro } from "../assets/drone-parallel-diode-capacitors"
import { dronePlacements } from "../fixtures/drone-parallel-diode-capacitor-layout"
import { createDroneParallelComparison } from "../fixtures/drone-parallel-diode-capacitor-comparison"
import { createSectionedSchematicSnapshot } from "../fixtures/create-sectioned-schematic-snapshot"
import {
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

// Two full 58-component renders and three snapshots can exceed CI's 5s default.
test("corrects all four diode/capacitor branches while preserving the complete drone circuit", async () => {
  const before = await createDroneParallelDiodeCapacitorRepro(),
    after = await createDroneParallelDiodeCapacitorRepro(dronePlacements())
  for (const json of [before, after]) expectReproRendered(json, 58)
  const electrical = (j: CircuitJson) =>
    j.filter((e) =>
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
  const baseline = analyzeSchematicPlacement(before),
    analysis = analyzeSchematicPlacement(after)
  expect(
    baseline.getIssues({ issueTypes: ["ParallelDiodeCapacitorNotAligned"] }),
  ).toHaveLength(4)
  expect(baseline.getIssues()).toHaveLength(9)
  expect(analysis.getIssues()).toEqual([])
  const rotated = new Set(["D1", "D2", "D3", "D4"])
  for (const source of before.filter((e) => e.type === "source_component")) {
    const b = getReproSchematicComponent(before, source.name!),
      a = getReproSchematicComponent(after, source.name!)
    expect(a).toEqual({
      ...b,
      center: a.center,
      size:
        source.name === "L1"
          ? { width: b.size.height, height: b.size.width }
          : b.size,
      symbol_name:
        source.name === "L1"
          ? "inductor_up"
          : rotated.has(source.name!)
            ? "diode_up"
            : b.symbol_name,
    })
    for (const pin of before.filter(
      (e) =>
        e.type === "schematic_port" &&
        e.schematic_component_id === b.schematic_component_id,
    )) {
      if (pin.type !== "schematic_port") continue
      const other = after.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === pin.source_port_id,
      )
      if (other?.type !== "schematic_port")
        throw new Error("Missing corrected port")
      expect(other.pin_number).toBe(pin.pin_number)
      if (source.name === "L1") {
        expect(other.center.x - a.center.x).toBeCloseTo(
          -(pin.center.y - b.center.y),
          6,
        )
        expect(other.center.y - a.center.y).toBeCloseTo(
          pin.center.x - b.center.x,
          6,
        )
        continue
      }
      const sign = rotated.has(source.name!) ? -1 : 1
      expect(other.center.x - a.center.x).toBeCloseTo(
        sign * (pin.center.x - b.center.x),
        6,
      )
      expect(other.center.y - a.center.y).toBeCloseTo(
        sign * (pin.center.y - b.center.y),
        6,
      )
    }
  }
  // Prove each shared connection is a continuous drawn wire, without traversing labels.
  const edges = after.flatMap((e) =>
    e.type === "schematic_trace" ? e.edges : [],
  )
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  const vertices = edges.flatMap((e) => [e.from, e.to])
  const segments = edges.map((e) =>
    vertices
      .filter(
        (p) =>
          Math.abs(
            (p.x - e.from.x) * (e.to.y - e.from.y) -
              (p.y - e.from.y) * (e.to.x - e.from.x),
          ) < 1e-6 &&
          p.x >= Math.min(e.from.x, e.to.x) - 1e-6 &&
          p.x <= Math.max(e.from.x, e.to.x) + 1e-6 &&
          p.y >= Math.min(e.from.y, e.to.y) - 1e-6 &&
          p.y <= Math.max(e.from.y, e.to.y) + 1e-6,
      )
      .map(key),
  )
  const pin = (name: string, number: string) => {
    const source = getReproSourcePort(after, name, number)
    const p = after.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === source.source_port_id,
    )
    if (p?.type !== "schematic_port") throw new Error("Missing drawn pin")
    return key(p.center)
  }
  const connectedPairs = [
    ...Array.from({ length: 4 }, (_, i) =>
      ["pin1", "pin2"].map(
        (number) =>
          [pin(`D${i + 1}`, number), pin(`CM${i + 1}`, number)] as const,
      ),
    ).flat(),
    [pin("U3", "pin4"), pin("L1", "pin1")],
    [pin("U3", "pin2"), pin("L1", "pin2")],
  ]
  for (const [start, end] of connectedPairs) {
    const reached = new Set([start])
    let previous = -1
    while (previous !== reached.size) {
      previous = reached.size
      for (const segment of segments)
        if (segment.some((p) => reached.has(p)))
          for (const p of segment) reached.add(p)
    }
    expect(reached.has(end)).toBe(true)
  }
  const original = { circuitJson: before, analysis: baseline },
    corrected = { circuitJson: after, analysis }
  const comparison = createDroneParallelComparison(original, corrected)
  const detail = createDroneParallelComparison(original, corrected, true)
  expect(comparison.match(/data-issue-number=/g)).toHaveLength(8)
  expect(detail.match(/data-issue-number=/g)).toHaveLength(2)
  expect(comparison).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(detail).toMatchSvgSnapshot(import.meta.path, "detail")
  expect(
    createSectionedSchematicSnapshot({
      circuitJson: after,
      analysis,
      sections: [
        {
          title: "Controller, supply capacitors, and programming points",
          componentNames: [
            "U1",
            "COUT1",
            "COUT2",
            "CESP",
            "CESPHF",
            "CIMU",
            "CIMUB",
            "CIO",
            "CEN",
            "REN",
            "RBOOT",
            ...Array.from({ length: 6 }, (_, i) => `TP${i + 1}`),
          ],
        },
        {
          title: "Power converter and battery input",
          componentNames: ["U3", "L1", "CIN", "CVINA", "CBULK", "BAT1", "BAT2"],
        },
        {
          title: "IMU and battery sensing",
          componentNames: ["U2", "CREG", "RCS", "CADC", "RADCH", "RADCL"],
        },
        {
          title: "All four motor blocks",
          componentNames: Array.from({ length: 4 }, (_, i) => [
            `Q${i + 1}`,
            `D${i + 1}`,
            `RG${i + 1}`,
            `RPD${i + 1}`,
            `CM${i + 1}`,
            `M${i + 1}_POS`,
            `M${i + 1}_NEG`,
          ]).flat(),
        },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
}, 15_000)
