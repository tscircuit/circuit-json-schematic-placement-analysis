import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { watchyI2cPullups } from "../assets/watchy-i2c-pullups"
import { createWatchyI2cPullupPlacement } from "../assets/watchy-i2c-pullups/placement"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
} from "../fixtures/placement-repro-assertions"

test("Watchy accelerometer reconstruction groups the pull-ups without changing connections", async () => {
  const connections = [
    ["R18.pin1", "U6.pin2", "net.SDA"],
    ["R20.pin1", "U6.pin12", "net.SCL"],
    ["R18.pin2", "R20.pin2", "U6.pin3", "U6.pin7", "U6.pin10", "net.P3V3"],
    ["U6.pin1", "U6.pin8", "U6.pin9", "net.GND"],
    ["U6.pin5", "net.ACC_INT_1"],
    ["U6.pin6", "net.ACC_INT_2"],
  ]
  expectReproNets(watchyI2cPullups, connections)
  const before = await createWatchyI2cPullupPlacement()
  const after = await createWatchyI2cPullupPlacement(true)
  const issueTypes = ["I2cPullupPairNotGrouped"] as const
  expect(
    analyzeSchematicPlacement(before, {
      issueTypes: [...issueTypes],
    }).getIssues(),
  ).toMatchObject([
    {
      sdaResistorSchematicBox: { sourceComponentName: "R18" },
      sclResistorSchematicBox: { sourceComponentName: "R20" },
      hostSchematicBox: { sourceComponentName: "U6" },
    },
  ])
  expect(
    analyzeSchematicPlacement(after, {
      issueTypes: [...issueTypes],
    }).getIssues(),
  ).toEqual([])
  expect(after.filter((element) => element.type.startsWith("source_"))).toEqual(
    before.filter((element) => element.type.startsWith("source_")),
  )
  expect(getReproSchematicComponent(after, "U6")).toEqual(
    getReproSchematicComponent(before, "U6"),
  )
  for (const [variant, circuitJson] of [
    ["before", before],
    ["after", after],
  ] as const) {
    expectReproRendered(circuitJson, 3)
    expectReproNets(circuitJson, connections)
    expect(
      createIssueReproSnapshot({
        circuitJson,
        analysis: analyzeSchematicPlacement(circuitJson, {
          issueTypes: [...issueTypes],
        }),
        issueTypes: [...issueTypes],
        showOverlay: true,
        showFullSchematic: true,
        width: 1000,
        height: 750,
      }),
    ).toMatchSvgSnapshot(import.meta.path, variant)
  }
})
