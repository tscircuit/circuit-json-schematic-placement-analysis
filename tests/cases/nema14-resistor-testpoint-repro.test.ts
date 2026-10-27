import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema14ResistorTestPoint } from "../assets/nema14-resistor-testpoint"
import {
  expectReproRendered,
  expectReproNets,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("reproduces the real nema14-resistor-testpoint positions and connections", async () => {
  const json = await createNema14ResistorTestPoint()
  expectReproRendered(json, 2)
  for (const [name, x, y] of [
    ["R_USB_BOOT", 23, 15],
    ["TP_BOOT", 27, 12.5],
  ] as const)
    expect(getReproSchematicComponent(json, name).center).toEqual({ x, y })
  expectReproNets(json, [
    ["R_USB_BOOT.pin1", "net.V3V3"],
    ["R_USB_BOOT.pin2", "TP_BOOT.pin1", "net.BOOT_PAD"],
  ])
  const analysis = analyzeSchematicPlacement(json)
  expect(analysis.getIssues().map((i) => i.lineItemType)).toEqual([
    "ResistorTestPointNotAligned",
  ])
  expect(
    createIssueReproSnapshot({
      circuitJson: json,
      analysis,
      showFullSchematic: true,
      showIssueGeometry: false,
      showListingIssueMarkers: true,
      width: 1400,
      height: 650,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "network")
})
