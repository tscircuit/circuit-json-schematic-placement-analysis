import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import original from "../assets/pd-i2c-inverted-pull-ups.json"
import { createPdI2cPullUpsCircuitJson } from "../assets/pd-i2c-pull-ups"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

// Unchanged source/schematic elements for R_PD_SDA and R_PD_SCL from the
// pd-power-supply-0.3mm Circuit JSON, including their shared rail below them.
test("captures the PD I2C pull-up rail below both resistors and verifies the 180 degree correction", async () => {
  const before = original as unknown as CircuitJson
  const serialized = JSON.stringify(before)
  const issueTypes = ["TwoPinComponentHasInvertedRails"] as const
  const analysis = analyzeSchematicPlacement(before, { issueTypes })
  const issues = analysis.getIssues()
  expect(issues).toHaveLength(2)
  expect(issues).toMatchObject(
    ["R_PD_SDA", "R_PD_SCL"].map((name) => ({
      lineItemType: "TwoPinComponentHasInvertedRails",
      schematicBox: { sourceComponentName: name },
      railSourcePortId: getReproSourcePort(before, name, "pin2").source_port_id,
      railPinName: "pin2",
      railType: "power",
      deltaSchRotation: 180,
      suggestedRailFacingDirection: "up",
    })),
  )
  expect(analyzeSchematicPlacement(before).getIssues({ issueTypes })).toEqual(
    issues,
  )
  const renderedBefore = await createPdI2cPullUpsCircuitJson()
  const first = issues[0]!
  if (first.lineItemType !== "TwoPinComponentHasInvertedRails")
    throw new Error("Expected inverted pull-up rail")
  const after = await createPdI2cPullUpsCircuitJson(
    270 + first.deltaSchRotation,
  )
  expect(after.filter((e) => e.type.startsWith("source_"))).toEqual(
    renderedBefore.filter((e) => e.type.startsWith("source_")),
  )
  expect(analyzeSchematicPlacement(after).getIssues()).toEqual([])
  for (const json of [before, renderedBefore, after]) {
    expectReproNets(json, [
      ["R_PD_SDA.pin1", "net.PD_SDA"],
      ["R_PD_SCL.pin1", "net.PD_SCL"],
      ["R_PD_SDA.pin2", "R_PD_SCL.pin2", "net.V3V3"],
    ])
    for (const name of ["R_PD_SDA", "R_PD_SCL"]) {
      const supply = getReproSourcePort(json, name, "pin2")
      const signal = getReproSourcePort(json, name, "pin1")
      const supplyPin = json.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === supply.source_port_id,
      )
      const signalPin = json.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === signal.source_port_id,
      )
      if (
        supplyPin?.type !== "schematic_port" ||
        signalPin?.type !== "schematic_port"
      )
        throw new Error("Missing rendered resistor pins")
      expect(supplyPin.facing_direction).toBe(json === after ? "up" : "down")
      expect(
        json === after
          ? supplyPin.center.y > signalPin.center.y
          : supplyPin.center.y < signalPin.center.y,
      ).toBe(true)
    }
  }
  for (const [name, json] of [
    ["before", before],
    ["after", after],
  ] as const) {
    expect(
      createSchematicAnalysisFixtureSvg({
        circuitJson: json,
        highlightIssues: [...issueTypes],
      }),
    ).toMatchSvgSnapshot(import.meta.path, name)
  }
  expect(JSON.stringify(before)).toBe(serialized)
})
