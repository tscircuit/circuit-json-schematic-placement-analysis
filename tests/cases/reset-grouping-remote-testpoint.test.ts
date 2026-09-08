import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createResetGroupingVariant } from "../assets/reset-grouping-variants"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import { expectReproNets } from "../fixtures/placement-repro-assertions"
import { getPlacementIssues } from "../fixtures/get-placement-issues"

test("allows a remote test point when the reset resistor and capacitor are compact", async () => {
  const circuitJson = await createResetGroupingVariant("remote-testpoint")
  expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])
  expectReproNets(circuitJson, [
    ["U1.NRST", "R1.pin1", "C1.pin1", "net.RESET", "TP1.pin1"],
    ["R1.pin2", "net.SUPPLY"],
    ["C1.pin2", "net.GND"],
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    getPlacementIssues(analysis).filter(
      (e) => e.lineItemType === "ResetNetworkNotGrouped",
    ),
  ).toEqual([])
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
