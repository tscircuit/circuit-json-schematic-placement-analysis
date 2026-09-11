import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

async function render(rotation: number) {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schTraceAutoLabelEnabled>
      <net name="SUPPLY" isPowerNet />
      <net name="GND" isGroundNet />
      <capacitor name="C1" capacitance="10uF" schRotation={rotation} />
      <trace name="SUPPLY" from=".C1 > .pin1" to="net.SUPPLY" />
      <trace name="GND" from=".C1 > .pin2" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

test("applies the rail flip without swapping pins and avoids guessing unknown supply polarity", async () => {
  const before = await render(90)
  const analysis = analyzeSchematicPlacement(before)
  expect(analysis.getIssues()).toHaveLength(1)
  const issue = analysis.getIssues()[0]!
  if (issue.lineItemType !== "TwoPinComponentHasInvertedRails")
    throw new Error("Expected inverted rails")
  const after = await render(90 + issue.deltaSchRotation)
  expect(analyzeSchematicPlacement(after).getIssues()).toEqual([])
  // Rerender with the actual recommendation; source pin assignments stay identical.
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    before.filter((e) => e.type.startsWith("source_")),
  )
  for (const json of [before, after])
    expectReproNets(json, [
      ["C1.pin1", "net.SUPPLY"],
      ["C1.pin2", "net.GND"],
    ])
  const positive = getReproSourcePort(after, "C1", "pin1")
  const ground = getReproSourcePort(after, "C1", "pin2")
  expect(issue.railSourcePortId).toBe(positive.source_port_id)
  expect(
    after.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === positive.source_port_id,
    ),
  ).toMatchObject({ facing_direction: "up" })
  expect(
    after.find(
      (e) =>
        e.type === "schematic_port" &&
        e.source_port_id === ground.source_port_id,
    ),
  ).toMatchObject({ facing_direction: "down" })
  // Declaring power without polarity, or contradictory ground metadata, is insufficient.
  for (const change of [
    { is_positive_voltage_source: false },
    { is_ground: true },
  ]) {
    const ambiguous = before.map((e) =>
      e.type === "source_net" && e.name === "SUPPLY" ? { ...e, ...change } : e,
    )
    expect(analyzeSchematicPlacement(ambiguous).getIssues()).toEqual([])
  }
  for (const [name, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        highlightIssues: ["TwoPinComponentHasInvertedRails"],
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
})
