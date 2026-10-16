import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createBicycleBrakeLights } from "../assets/bicycle-brake-light"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("reproduces the complete bicycle Lights sheet with six parallel LED branches drawn inline", async () => {
  const circuitJson = await createBicycleBrakeLights()
  expectReproRendered(circuitJson, 15)
  for (let i = 0; i < 6; i++) {
    const y = 5.475 - Math.floor(i / 2) * 3.65
    const x = -7.05 + (i % 2) * 9.4
    expect(
      getReproSchematicComponent(circuitJson, `R${12 + i}`).center,
    ).toEqual({ x, y })
    expect(getReproSchematicComponent(circuitJson, `D${i + 1}`).center).toEqual(
      { x: x + 4.7, y },
    )
  }
  for (const [name, x] of [
    ["Q1", -7.05],
    ["R18", -2.35],
    ["R19", 2.35],
  ] as const)
    expect(getReproSchematicComponent(circuitJson, name).center).toEqual({
      x,
      y: -5.475,
    })
  expectReproNets(circuitJson, [
    ["net.V3V3", ...Array.from({ length: 6 }, (_, i) => `R${12 + i}.pin1`)],
    [
      "net.LED_RETURN",
      "Q1.pin3",
      ...Array.from({ length: 6 }, (_, i) => `D${i + 1}.pin1`),
    ],
    ...Array.from({ length: 6 }, (_, i) => [
      `net.LED${i + 1}_A`,
      `R${12 + i}.pin2`,
      `D${i + 1}.pin2`,
    ]),
    ["net.GATE", "Q1.pin1", "R18.pin2", "R19.pin1"],
    ["net.GND", "Q1.pin2", "R19.pin2"],
    ["net.LED_PWM", "R18.pin1"],
  ])
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    ...Array(7).fill("TwoPinComponentShouldBeVertical"),
    "MosfetGateNetworkNotGrouped",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      width: 1400,
      height: 1000,
      schematicSheetId: circuitJson.find((e) => e.type === "schematic_sheet")!
        .schematic_sheet_id,
      viewportBounds: { left: -9.8, right: 9.7, top: 7, bottom: -7.1 },
      showIssueGeometry: false,
      showListingIssueMarkers: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "full-sheet")
})
