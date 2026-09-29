import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { watchyI2cPullups as circuitJson } from "../assets/watchy-i2c-pullups"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("detects Watchy SDA and SCL pull-ups split around the accelerometer", () => {
  const original = JSON.stringify(circuitJson)
  expectReproRendered(circuitJson, 16)
  expectReproNets(circuitJson, [
    ["R18.pin1", "U6.pin2", "net.SDA"],
    ["R20.pin1", "U6.pin12", "net.SCL"],
    ["R18.pin2", "R20.pin2", "net.P3V3"],
  ])

  const sdaPullup = getReproSchematicComponent(circuitJson, "R18")
  const sclPullup = getReproSchematicComponent(circuitJson, "R20")
  const accelerometer = getReproSchematicComponent(circuitJson, "U6")
  expect(sdaPullup.schematic_sheet_id).toBe("schematic_sheet_3")
  expect(sclPullup.schematic_sheet_id).toBe("schematic_sheet_3")
  expect(sdaPullup.center.y).toBeGreaterThan(accelerometer.center.y)
  expect(sclPullup.center.x).toBeGreaterThan(accelerometer.center.x)
  expect(Math.abs(sdaPullup.center.y - sclPullup.center.y)).toBeGreaterThan(1)

  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({
    issueTypes: ["I2cPullupPairNotGrouped"],
  })
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    railName: "P3V3",
    sdaResistorSchematicBox: { sourceComponentName: "R18" },
    sclResistorSchematicBox: { sourceComponentName: "R20" },
    hostSchematicBox: { sourceComponentName: "U6" },
  })
  expect(analysis.schematicIssuesToString(issues[0]!)).toContain(
    'sdaResistorName="R18"',
  )
  expect(
    analyzeSchematicPlacement(circuitJson, {
      issueTypes: ["I2cPullupPairNotGrouped"],
    }).getIssueCounts().I2cPullupPairNotGrouped,
  ).toBe(1)

  // Keep quiet when the same real board's pull-ups sit together above U6.
  const grouped = structuredClone(circuitJson)
  const groupedScl = getReproSchematicComponent(grouped, "R20")
  groupedScl.center = {
    x: sdaPullup.center.x + 1.2,
    y: sdaPullup.center.y,
  }
  expect(
    analyzeSchematicPlacement(grouped).getIssues({
      issueTypes: ["I2cPullupPairNotGrouped"],
    }),
  ).toEqual([])

  const otherSheet = structuredClone(circuitJson)
  getReproSchematicComponent(otherSheet, "R20").schematic_sheet_id =
    "different-sheet"
  expect(
    analyzeSchematicPlacement(otherSheet).getIssues({
      issueTypes: ["I2cPullupPairNotGrouped"],
    }),
  ).toEqual([])
  expect(JSON.stringify(circuitJson)).toBe(original)
})
