import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createGameboyGroundedCapacitor } from "../assets/gameboy-grounded-capacitor"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
test("reproduces the Game Boy amplifier capacitor across the chip from VREF", async () => {
  const json = await createGameboyGroundedCapacitor()
  expectReproRendered(json, 2)
  expect(getReproSchematicComponent(json, "U_SPK_AMP").center).toEqual({
    x: -2,
    y: 2,
  })
  expect(getReproSchematicComponent(json, "C_AMP_VREF").center).toEqual({
    x: 2,
    y: 2,
  })
  expectReproNets(json, [
    ["U_SPK_AMP.pin8", "C_AMP_VREF.pin1"],
    [
      "C_AMP_VREF.pin2",
      "U_SPK_AMP.pin2",
      "U_SPK_AMP.pin10",
      "U_SPK_AMP.pin11",
      "U_SPK_AMP.pin15",
      "net.GND",
    ],
    [
      "U_SPK_AMP.pin4",
      "U_SPK_AMP.pin5",
      "U_SPK_AMP.pin6",
      "U_SPK_AMP.pin13",
      "net.V3V3",
    ],
    ["U_SPK_AMP.pin12", "net.AMP_ENABLE"],
    ["U_SPK_AMP.pin7", "net.AMP_INPUT"],
    ["U_SPK_AMP.pin1", "net.SPK_POS"],
    ["U_SPK_AMP.pin3", "net.SPK_NEG"],
  ])
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues()).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 700,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "network")
})
