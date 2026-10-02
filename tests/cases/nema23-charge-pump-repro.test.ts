import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createNema23ChargePump } from "../assets/nema23-charge-pump"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
} from "../fixtures/placement-repro-assertions"

// TI draws the 100nF capacitor directly beside CPL/CPH in Figure 8-1.
// https://www.ti.com/lit/ds/symlink/drv8462.pdf#page=101
test("preserves the separated charge-pump capacitor on the complete NEMA23 driver sheet", async () => {
  const circuitJson = await createNema23ChargePump()
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 18)
  expectReproNets(circuitJson, [
    ["C_CP.pin1", "DRIVER.CPH"],
    ["C_CP.pin2", "DRIVER.CPL"],
  ])
  expect(getReproSchematicComponent(circuitJson, "C_CP").center).toEqual({
    x: 3,
    y: 9,
  })
  expect(getReproSchematicComponent(circuitJson, "DRIVER").center).toEqual({
    x: 0,
    y: 0,
  })
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issueTypes = ["CapacitorSeparatedFromChipPins"] as const
  const issues = analysis.getIssues({ issueTypes })
  expect(analysis.getIssues()).toHaveLength(4)
  expect(
    analysis.getIssues({ issueTypes: ["TwoPinComponentHasInvertedRails"] }),
  ).toMatchObject(
    ["R_CS", "R_FAULT", "R_HOME"].map((name) => ({
      schematicBox: { sourceComponentName: name },
      railPinName: "pin2",
      deltaSchRotation: 180,
    })),
  )
  expect(issues).toMatchObject([
    {
      hostSchematicBox: { sourceComponentName: "DRIVER" },
      capacitorSchematicBox: { sourceComponentName: "C_CP" },
      chipSourcePortIds: [
        getReproSourcePort(circuitJson, "DRIVER", "CPH").source_port_id,
        getReproSourcePort(circuitJson, "DRIVER", "CPL").source_port_id,
      ],
    },
  ])
  const sheet = circuitJson.find(
    (e) => e.type === "schematic_sheet" && e.name === "driver",
  )
  if (sheet?.type !== "schematic_sheet") throw new Error("Missing driver sheet")
  expect(
    circuitJson
      .filter((e) => e.type === "schematic_trace")
      .every((e) => e.schematic_sheet_id === sheet.schematic_sheet_id),
  ).toBe(true)
  const svg = createIssueReproSnapshot({
    circuitJson,
    analysis,
    schematicSheetId: sheet.schematic_sheet_id,
    showFullSchematic: true,
    issueTypes,
    showOverlay: true,
    showListingIssueMarkers: true,
    width: 1800,
    height: 1200,
  })
  const number = analysis.getIssues().indexOf(issues[0]!) + 1
  expect(
    [...svg.matchAll(/data-issue-number="(\d+)"/g)].map((m) => Number(m[1])),
  ).toEqual([number, number])
  expect(svg).toContain(`data-listing-issue-number="${number}"`)
  expect(svg).toMatchSvgSnapshot(import.meta.path, "full-sheet")
  expect(JSON.stringify(circuitJson)).toBe(original)
})
