import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { stackSvgsVertically } from "stack-svgs"
import { analyzeSchematicPlacement } from "lib/index"
import { createAnalyzerTextSvg } from "lib/svg/create-analyzer-text-svg"
import { renderIssueOverlay } from "lib/svg/create-issue-overlay-svg"
import { createPlacementComparisonSvg } from "../fixtures/create-placement-comparison-svg"
import {
  expectReproRendered,
  getReproSourcePort,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createAstraFuseDiode } from "../assets/astra-fuse-diode"

test("aligns the fuse / diode pair and places the shunt diode ground below without changing connections", async () => {
  const electrical = (json: CircuitJson) =>
    json.filter((e) =>
      [
        "source_component",
        "source_port",
        "source_net",
        "source_trace",
        "source_group",
        "source_bus",
        "source_component_internal_connection",
      ].includes(e.type),
    )
  const before = await createAstraFuseDiode(false, "pair")
  const after = await createAstraFuseDiode(true, "pair")
  const completeBefore = await createAstraFuseDiode(false, "filter")
  const completeAfter = await createAstraFuseDiode(true, "filter")
  for (const [a, b, count] of [
    [before, after, 2],
    [completeBefore, completeAfter, 5],
  ] as const) {
    expectReproRendered(a, count)
    expectReproRendered(b, count)
    expect(electrical(b)).toEqual(electrical(a))
    expect(
      analyzeSchematicPlacement(a)
        .getIssues()
        .map((i) => i.lineItemType),
    ).toEqual([
      "FuseDiodeNotAligned",
      ...(count === 5 ? ["TwoPinComponentHasInvertedRails" as const] : []),
    ])
    expect(analyzeSchematicPlacement(b).getIssues()).toEqual([])
    for (const [n, p, m, q] of [
      ["F_MOTOR_VBUS", "pin2", "D_MOTOR_BLOCK", "anode"],
    ] as const)
      expectDrawnWire(b, n, p, m, q)
    const rotations: Record<string, number> = { D_MOTOR_TVS: 180 }
    for (const component of a.filter((e) => e.type === "source_component")) {
      const first = getReproSchematicComponent(a, component.name!)
      const second = getReproSchematicComponent(b, component.name!)
      if (component.name === "F_MOTOR_VBUS") {
        // The native horizontal and vertical fuse drawings have different origins
        // and pin order. Verify their rendered terminals instead of assuming a rigid rotation.
        expect(first.symbol_name).toBe("fuse_vert")
        expect(second.symbol_name).toBe("fuse_horz")
        for (const pinNumber of [1, 2]) {
          const pin = b.find(
            (e) =>
              e.type === "schematic_port" &&
              e.schematic_component_id === second.schematic_component_id &&
              e.pin_number === pinNumber,
          )
          if (pin?.type !== "schematic_port")
            throw new Error("Missing fuse terminal")
          expect(pin.center.y).toBeCloseTo(-7.5, 6)
          expect(pin.facing_direction).toBe(pinNumber === 1 ? "left" : "right")
        }
        continue
      }
      const angle = ((rotations[component.name!] ?? 0) * Math.PI) / 180
      if (!angle) expect(second.symbol_name).toBe(first.symbol_name)
      for (const pin of a.filter(
        (e) =>
          e.type === "schematic_port" &&
          e.schematic_component_id === first.schematic_component_id,
      )) {
        if (pin.type !== "schematic_port") continue
        const other = b.find(
          (e) =>
            e.type === "schematic_port" &&
            e.source_port_id === pin.source_port_id,
        )
        if (other?.type !== "schematic_port")
          throw new Error("Missing corrected port")
        expect(other.pin_number).toBe(pin.pin_number)
        const dx = pin.center.x - first.center.x,
          dy = pin.center.y - first.center.y
        expect(other.center.x - second.center.x).toBeCloseTo(
          dx * Math.cos(angle) - dy * Math.sin(angle),
          6,
        )
        expect(other.center.y - second.center.y).toBeCloseTo(
          dx * Math.sin(angle) + dy * Math.cos(angle),
          6,
        )
      }
    }
  }
  const groundNet = completeAfter.find(
    (e) => e.type === "source_net" && e.is_ground,
  )
  if (groundNet?.type !== "source_net") throw new Error("Missing ground net")
  const groundPort = getReproSourcePort(completeAfter, "D_MOTOR_TVS", "anode")
  expect(groundPort.subcircuit_connectivity_map_key).toBe(
    groundNet.subcircuit_connectivity_map_key,
  )
  const diode = getReproSchematicComponent(completeAfter, "D_MOTOR_TVS")
  const drawnGroundPort = completeAfter.find(
    (e) =>
      e.type === "schematic_port" &&
      e.source_port_id === groundPort.source_port_id,
  )
  if (drawnGroundPort?.type !== "schematic_port")
    throw new Error("Missing shunt diode ground terminal")
  expect(drawnGroundPort.facing_direction).toBe("down")
  expect(drawnGroundPort.center.y).toBeLessThan(diode.center.y)
  expectDrawnWire(
    completeAfter,
    "D_MOTOR_TVS",
    "cathode",
    "C_MOTOR_BULK",
    "pin1",
  )
  expect(
    completeAfter.some(
      (e) =>
        e.type === "schematic_net_label" &&
        e.source_net_id === groundNet.source_net_id &&
        e.symbol_name === "rail_down" &&
        e.anchor_position?.x === drawnGroundPort.center.x &&
        e.anchor_position?.y === drawnGroundPort.center.y,
    ),
  ).toBe(true)
  const baseline = analyzeSchematicPlacement(before),
    analysis = analyzeSchematicPlacement(after)
  const comparison = createPlacementComparisonSvg({
    backgroundColor: "#f5f1ed",
    subject: "fuse / diode pair",
    before: { circuitJson: before, analysis: baseline },
    after: { circuitJson: after, analysis },
    issues: baseline.getIssues(),
    contextSourceComponentIds: before.flatMap((e) =>
      e.type === "source_component" ? [e.source_component_id] : [],
    ),
    beforeDiagnostic: () =>
      "F_MOTOR_VBUS / D_MOTOR_BLOCK: connected pins face different axes.",
    afterDiagnostic:
      "Fuse and diode now connect along one straight wire.\nFull analysis of the pair: 0 reported issues.",
    note: "Only the fuse is rotated and shifted 0.04 mm to align the native symbol terminals. Diode polarity and all connections are unchanged.",
  })
  expect(comparison.match(/data-issue-number=/g)).toHaveLength(2)
  expect(comparison).toMatchSvgSnapshot(import.meta.path, "comparison")
  expect(
    stackSvgsVertically(
      [
        renderIssueOverlay({
          circuitJson: completeAfter,
          analysis: analyzeSchematicPlacement(completeAfter),
          showFullSchematic: true,
          showOverlay: false,
          width: 1200,
          height: 500,
        }).svg,
        createAnalyzerTextSvg(
          "Complete 5-component filtering section.\nFull analysis: 0 reported issues.",
          1200,
        ),
      ],
      { normalizeSize: false, gap: 0 },
    ).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path, "full-section")
})

// Check visible trace continuity too: equal electrical nets alone can be joined only by labels.
function expectDrawnWire(
  json: CircuitJson,
  a: string,
  ap: string,
  b: string,
  bp: string,
) {
  const first = getReproSourcePort(json, a, ap),
    second = getReproSourcePort(json, b, bp)
  const pin = (id: string) => {
    const p = json.find(
      (e) => e.type === "schematic_port" && e.source_port_id === id,
    )
    if (p?.type !== "schematic_port") throw new Error("Missing drawn port")
    return p.center
  }
  const start = pin(first.source_port_id),
    end = pin(second.source_port_id)
  const edges = json.flatMap((e) =>
    e.type === "schematic_trace" &&
    e.subcircuit_connectivity_map_key === first.subcircuit_connectivity_map_key
      ? e.edges
      : [],
  )
  const vertices = [start, end, ...edges.flatMap((e) => [e.from, e.to])]
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
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
  const reached = new Set([key(start)])
  let previous = -1
  while (previous !== reached.size) {
    previous = reached.size
    for (const segment of segments)
      if (segment.some((p) => reached.has(p)))
        for (const p of segment) reached.add(p)
  }
  expect(reached.has(key(end))).toBe(true)
}
