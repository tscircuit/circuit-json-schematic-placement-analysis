import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { f1c1990sDevBoard as circuitJson } from "../assets/f1c1990s-dev-board"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// AP2112 typical application: CIN beside VIN, COUT beside VOUT.
// https://www.diodes.com/assets/Datasheets/AP2112.pdf#page=2
test("records reversed regulator capacitor placement on the complete F1C1990S sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 90)
  for (const [name, y, rail] of [
    ["U_1V8", 0, "V1V8"],
    ["U_1V2", -9, "V1V2"],
  ] as const) {
    expectReproNets(circuitJson, [
      [`${name}.IN`, `C_${name}_IN.pin1`, "net.V3V3"],
      [`${name}.OUT`, `C_${name}_OUT.pin1`, `net.${rail}`],
      [
        `${name}.GND`,
        `C_${name}_IN.pin2`,
        `C_${name}_OUT.pin2`,
        "net.BOARD_GND",
      ],
    ])
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x: -21,
      y,
    })
    expect(
      getReproSchematicComponent(circuitJson, `C_${name}_IN`).center,
    ).toEqual({ x: -16.8, y: y - 0.95 })
    expect(
      getReproSchematicComponent(circuitJson, `C_${name}_OUT`).center,
    ).toEqual({ x: -25.2, y: y - 0.95 })
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    }),
  ).toEqual([])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      showFullSchematic: true,
      showOverlay: false,
      width: 2200,
      height: 1600,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
