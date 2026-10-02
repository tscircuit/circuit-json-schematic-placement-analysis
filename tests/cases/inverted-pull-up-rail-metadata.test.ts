import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import original from "../assets/pd-i2c-inverted-pull-ups.json"
import { createPdI2cPullUpsCircuitJson } from "../assets/pd-i2c-pull-ups"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
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
    ["unclassified", controls["unclassified rail despite label"]!],
  ] as const) {
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        analysis: analyzeSchematicPlacement(json, { issueTypes }),
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
