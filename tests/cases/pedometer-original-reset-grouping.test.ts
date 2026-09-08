import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import originalSheet from "../assets/pedometer-original-sheet.json"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { getReproSchematicComponent } from "../fixtures/placement-repro-assertions"

test("finds the reset network in the original 78-component pedometer sheet without changing its geometry", () => {
  const circuitJson = originalSheet as CircuitJson
  const original = JSON.stringify(circuitJson)
  expect(
    circuitJson.filter((e) => e.type === "schematic_component"),
  ).toHaveLength(78)
  expect(getReproSchematicComponent(circuitJson, "U1").size).toEqual({
    width: 2.2,
    height: 4.2,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis
    .getLineItems()
    .flatMap((e) =>
      e.lineItemType === "SchematicPlacementIssues" ? e.issues : [],
    )
    .filter((e) => e.lineItemType === "ResetNetworkNotGrouped")
  expect(issues).toHaveLength(1)
  expect(issues[0]!.hostSchematicBox.sourceComponentName).toBe("U1")
  expect(issues[0]!.resetPinName).toBe("RSTN")
  expect(
    issues[0]!.supportComponents.map((p) => [
      p.sourceComponentName,
      p.schX,
      p.schY,
    ]),
  ).toEqual([
    ["R8", -12, -40],
    ["C21", 0, -28],
    ["TP5", 14, -26.919],
  ])
  expect(JSON.stringify(circuitJson)).toBe(original)
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1400,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
