import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import published from "../assets/rp2040-motor-driver.circuit.json"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

// imrishabh18/rp2040-motor-controller@1.0.42, motor_driver sheet.
// Literal exported records: preserve this sheet's source connections and their
// endpoints, plus its schematic geometry, routing, labels, and section text.
const circuitJson = published as unknown as CircuitJson

test("reports the motor-driver sheet's inner pin-label collision", async () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 19)
  expect(
    circuitJson.filter((element) => element.type === "schematic_sheet"),
  ).toEqual([
    expect.objectContaining({
      name: "motor_driver",
      sheet_width: 297,
      sheet_height: 210,
    }),
  ])
  expect(
    circuitJson.filter((element) => element.type === "schematic_trace"),
  ).toHaveLength(26)
  expect(getReproSchematicComponent(circuitJson, "DRIVER").center).toEqual({
    x: 2.58,
    y: -11.72,
  })

  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(analysis.getIssues()).toMatchObject([
    {
      lineItemType: "SchematicBoxInnerLabelCollision",
      schematicBox: { sourceComponentName: "DRIVER" },
      overlappingSides: ["left", "top"],
    },
  ])
  await expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_2",
      showFullSchematic: true,
      showOverlay: true,
      showListingIssueMarkers: true,
      width: 1800,
      height: 1300,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(JSON.stringify(circuitJson)).toBe(original)
})
