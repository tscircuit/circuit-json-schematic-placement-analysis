import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import original from "../assets/pd-i2c-inverted-pull-ups.json"
import { createPdI2cPullUpsCircuitJson } from "../assets/pd-i2c-pull-ups"
import {
  createAnalyzerTextSvg,
  createSchematicAnalysisFixtureSvg,
} from "../fixtures/create-schematic-analysis-fixture-svg"
import { getReproSourcePort } from "../fixtures/placement-repro-assertions"

test("uses positive-supply metadata for pull-up flips on either pin and skips uncertain or series roles", async () => {
  const before = original as unknown as CircuitJson
  const issueTypes = ["TwoPinComponentHasInvertedRails"] as const
  const issues = (json: CircuitJson) =>
    analyzeSchematicPlacement(json, { issueTypes }).getIssues()
  const renamed = before.map((e, i) => {
    if (
      e.type === "source_component" ||
      e.type === "source_port" ||
      e.type === "source_net"
    )
      return {
        ...e,
        name: `opaque_${i}`,
        ...(e.type === "source_port" ? { port_hints: [] } : {}),
      }
    return e
  })
  expect(issues(renamed)).toHaveLength(2)
  expect(
    issues(
      before.map((e) =>
        e.type === "source_net" ? { ...e, is_power: false } : e,
      ),
    ),
  ).toHaveLength(2)
  const supplyIds = new Set(
    before.flatMap((e) =>
      e.type === "source_net" && e.is_positive_voltage_source
        ? [e.source_net_id]
        : [],
    ),
  )
  const supplyPortIds = new Set(
    ["R_PD_SDA", "R_PD_SCL"].map(
      (name) => getReproSourcePort(before, name, "pin2").source_port_id,
    ),
  )
  const controls: Record<string, CircuitJson> = {
    "unknown supply polarity": before.map((e) =>
      e.type === "source_net" ? { ...e, is_positive_voltage_source: false } : e,
    ),
    "unclassified rail despite label": before.map((e) =>
      e.type === "source_net"
        ? { ...e, is_power: false, is_positive_voltage_source: false }
        : e,
    ),
    "contradictory supply": before.map((e) =>
      e.type === "source_net" && supplyIds.has(e.source_net_id)
        ? { ...e, is_ground: true }
        : e,
    ),
    "series between supplies": before.map((e) =>
      e.type === "source_net"
        ? { ...e, is_power: true, is_positive_voltage_source: true }
        : e,
    ),
    "series into supply pins": before.map((e) =>
      e.type === "source_port" && !supplyPortIds.has(e.source_port_id)
        ? { ...e, requires_power: true }
        : e,
    ),
    "signal capacitor": before.map((e) =>
      e.type === "source_component"
        ? { ...e, ftype: "simple_capacitor" as const, capacitance: 100e-9 }
        : e,
    ),
  }
  for (const [name, json] of Object.entries(controls))
    expect(issues(json), name).toEqual([])
  const pin1Before = await createPdI2cPullUpsCircuitJson(90, 1)
  expect(issues(pin1Before)).toMatchObject(
    ["R_PD_SDA", "R_PD_SCL"].map((name) => ({
      railSourcePortId: getReproSourcePort(pin1Before, name, "pin1")
        .source_port_id,
      railPinName: "pin1",
      deltaSchRotation: 180,
    })),
  )
  const first = issues(pin1Before)[0]!
  if (first.lineItemType !== "TwoPinComponentHasInvertedRails")
    throw new Error("Expected inverted rail")
  const pin1After = await createPdI2cPullUpsCircuitJson(
    90 + first.deltaSchRotation,
    1,
  )
  expect(issues(pin1After)).toEqual([])
  expect(pin1After.filter((e) => e.type.startsWith("source_"))).toEqual(
    pin1Before.filter((e) => e.type.startsWith("source_")),
  )
  for (const [name, json] of [
    ["pin1-before", pin1Before],
    ["pin1-after", pin1After],
  ] as const) {
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        analysis: analyzeSchematicPlacement(json, { issueTypes }),
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }

  // Keep the V3V3-named control above to check that names alone cannot imply
  // a supply, but make its visual snapshot clearly show an unclassified net.
  const unclassified = controls["unclassified rail despite label"]!.map((e) => {
    if (e.type === "source_net" && supplyIds.has(e.source_net_id))
      return { ...e, name: "UNCLASSIFIED_NET" }
    if (e.type === "schematic_net_label" && supplyIds.has(e.source_net_id)) {
      const { symbol_name, ...label } = e
      return {
        ...label,
        text: "UNCLASSIFIED_NET",
        anchor_side: "left" as const,
        anchor_position: { x: -1, y: -3.1 },
        center: { x: 0, y: -3.1 },
      }
    }
    return e
  })
  unclassified.push({
    type: "schematic_trace",
    schematic_trace_id: "unclassified-control-label-stub",
    source_trace_id: "source_trace_52",
    schematic_sheet_id: "schematic_sheet_0",
    edges: [{ from: { x: -1, y: -2.5 }, to: { x: -1, y: -3.1 } }],
    junctions: [],
  })
  const unclassifiedAnalysis = analyzeSchematicPlacement(unclassified, {
    issueTypes,
  })
  expect(unclassifiedAnalysis.getIssues()).toEqual([])
  const snapshot = stackSvgsVertically(
    [
      createSchematicAnalysisFixtureSvg({
        circuitJson: unclassified,
        analysis: unclassifiedAnalysis,
        highlightIssues: [...issueTypes],
      }),
      createAnalyzerTextSvg(
        "NEGATIVE CONTROL: UNCLASSIFIED_NET has no declared supply role.\n" +
          "is_power=false; is_positive_voltage_source=false.\n" +
          "Expected inverted-rail errors: 0. The analyzer cannot establish a positive supply.",
        1200,
      ).replace('fill="#d00"', 'fill="#334155"'),
    ],
    { normalizeSize: false, gap: 0 },
  )
  expect(snapshot).toMatchSvgSnapshot(import.meta.path, "unclassified")
})
