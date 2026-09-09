import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { getTrellisCoreSheetCircuitJson } from "../assets/trellis-core"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces Trellis Core's separated power LED and paired resistor before proximity fixes", () => {
  const circuitJson = getTrellisCoreSheetCircuitJson("power")
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 20)
  expectReproNets(circuitJson, [
    ["net.P3V3", "D1.pin2"],
    ["net.POWER_LED_K", "D1.pin1", "R4.pin1"],
    ["net.GND", "R4.pin2"],
  ])
  const led = getReproSchematicComponent(circuitJson, "D1")
  const resistor = getReproSchematicComponent(circuitJson, "R4")
  expect(led.center).toEqual({ x: 5.5, y: 4.8 })
  expect(resistor.center).toEqual({ x: 5.5, y: -1.58 })
  expect(Math.abs(led.center.y - resistor.center.y)).toBeCloseTo(6.38)

  const analysis = analyzeSchematicPlacement(circuitJson)
  // The same-net LED/resistor pair is separated, but the current alignment
  // analyzer emits no DiodeResistorNotAligned report for this published layout.
  expect(analysis.getIssueCounts().DiodeResistorNotAligned).toBe(0)
  expect(
    Object.entries(analysis.getIssueCounts()).filter(([, count]) => count > 0),
  ).toEqual([["TwoPinComponentShouldBeVertical", 10]])
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 1800,
      height: 1200,
    }).replace(/[ \t]+$/gm, ""),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
