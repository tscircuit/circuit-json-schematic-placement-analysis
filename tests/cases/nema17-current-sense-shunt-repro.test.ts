import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { nema17CurrentTelemetry as circuitJson } from "../assets/nema17-current-telemetry"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// TI INA241EVM Figure 6-1 shows R4_1 across the two sense-input branches.
// https://www.ti.com/lit/pdf/sbou279#page=8
test("records displaced current-sense shunts on the complete NEMA17 telemetry sheet", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 10)
  for (const [phase, x, windingPin] of [
    ["A", -8, "pin1"],
    ["B", 6, "pin3"],
  ] as const) {
    expectReproNets(circuitJson, [
      [`R_PHASE_${phase}.pin1`, `U_CURRENT_${phase}.IN_POS`],
      [
        `R_PHASE_${phase}.pin2`,
        `U_CURRENT_${phase}.IN_NEG`,
        `J1.${windingPin}`,
      ],
    ])
    const shunt = getReproSchematicComponent(circuitJson, `R_PHASE_${phase}`)
    expect(shunt.center).toEqual({ x, y: 5 })
    expect(shunt.symbol_name).toBe("boxresistor_right")
    expect(
      getReproSchematicComponent(circuitJson, `U_CURRENT_${phase}`).center,
    ).toEqual({ x, y: 0 })
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({
      issueTypes: ["TraceCanBeSimplifiedByMovingComponent"],
    }),
  ).toEqual([])
  const issues = analysis.getIssues({
    issueTypes: ["CurrentSenseShuntSeparatedFromInputs"],
  })
  expect(issues).toMatchObject([
    {
      shuntSchematicBox: { sourceComponentName: "R_PHASE_A" },
      amplifierSchematicBox: { sourceComponentName: "U_CURRENT_A" },
    },
    {
      shuntSchematicBox: { sourceComponentName: "R_PHASE_B" },
      amplifierSchematicBox: { sourceComponentName: "U_CURRENT_B" },
    },
  ])
  expect(analysis.getIssues()).toHaveLength(4)
  expect(
    analysis.getIssues({ issueTypes: ["SchematicTextCollision"] }),
  ).toHaveLength(2)
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    schematicSheetId: "schematic_sheet_6",
    issueTypes: ["CurrentSenseShuntSeparatedFromInputs"],
    showFullSchematic: true,
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 2200,
    height: 1400,
  })
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    ),
  ).toEqual([3, 3, 4, 4])
  expect(
    [...svg.matchAll(/data-listing-issue-number="(\d+)"/g)].map((match) =>
      Number(match[1]),
    ),
  ).toEqual([3, 4])
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
