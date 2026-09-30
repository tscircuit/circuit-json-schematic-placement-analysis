import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { I2cPullupPairPlacementSolver } from "lib/solvers/I2cPullupPairPlacementSolver/I2cPullupPairPlacementSolver"
import type { SchematicPlacementIssue } from "lib/types"
import { buildSolverContext } from "lib/utils/placements"
import { watchyI2cPullups as circuitJson } from "../assets/watchy-i2c-pullups"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"
import {
  expectReproNets,
  expectReproRendered,
  getReproSchematicComponent,
  getReproSourcePort,
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
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_3",
      issueTypes: ["I2cPullupPairNotGrouped"],
      showOverlay: true,
      width: 1000,
      height: 750,
    }),
  ).toMatchSvgSnapshot(import.meta.path, "focused")
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
  // Uniform drawing scale and translation preserve the result.
  for (const scale of [0.1, 1, 10]) {
    const ctx = buildSolverContext(circuitJson)
    ctx.componentPlacements = ctx.componentPlacements.map((placement) => ({
      ...placement,
      schX: placement.schX * scale + 100,
      schY: placement.schY * scale - 100,
      width: placement.width * scale,
      height: placement.height * scale,
    }))
    const issues: SchematicPlacementIssue[] = []
    new I2cPullupPairPlacementSolver({ ctx, issues }).solve()
    expect(issues).toHaveLength(1)
    const issue = issues[0]!
    if (issue.lineItemType !== "I2cPullupPairNotGrouped")
      throw new Error("Unexpected issue")
    expect(issue.bodyGap).toBeGreaterThan(issue.maxHostBodyGap)
  }

  // Electrical aliases must not duplicate the warning.
  {
    const withAliases = structuredClone(circuitJson)
    for (const role of ["SDA", "SCL"]) {
      const originalNet = withAliases.find(
        (element) => element.type === "source_net" && element.name === role,
      )
      if (originalNet?.type !== "source_net") throw new Error(`Missing ${role}`)
      const aliasId = `${originalNet.source_net_id}_alias`
      withAliases.push(
        { ...originalNet, source_net_id: aliasId, name: `I2C_${role}` },
        {
          type: "source_trace",
          source_trace_id: `${aliasId}_connection`,
          connected_source_port_ids: [],
          connected_source_net_ids: [originalNet.source_net_id, aliasId],
        },
      )
    }
    const analysis = analyzeSchematicPlacement(withAliases)
    expect(
      analysis.getIssues({ issueTypes: ["I2cPullupPairNotGrouped"] }),
    ).toHaveLength(1)
  }

  // Power metadata takes precedence over SDA/SCL net names.
  for (const pin of ["pin2", "pin12"]) {
    for (const powerFlag of ["requires_power", "provides_power"] as const) {
      const withPowerPorts = structuredClone(circuitJson)
      getReproSourcePort(withPowerPorts, "U6", pin)[powerFlag] = true
      expect(
        analyzeSchematicPlacement(withPowerPorts, {
          issueTypes: ["I2cPullupPairNotGrouped"],
        }).getIssues(),
      ).toEqual([])
    }
  }

  // Check alternate placements using the same Watchy connections.
  for (const [sdaCenter, sclCenter, count] of [
    [{ x: 0, y: 4 }, { x: 4, y: 0 }, 1],
    [{ x: 3, y: 3.6 }, { x: 3.6, y: 3 }, 0],
    [{ x: 4, y: 3 }, { x: 4, y: -3 }, 0],
  ] as const) {
    const alternate = structuredClone(circuitJson)
    const host = getReproSchematicComponent(alternate, "U6")
    host.center = { x: 0, y: 0 }
    host.size = { width: 2, height: 2 }
    getReproSchematicComponent(alternate, "R18").center = { ...sdaCenter }
    getReproSchematicComponent(alternate, "R20").center = { ...sclCenter }
    expect(
      analyzeSchematicPlacement(alternate, {
        issueTypes: ["I2cPullupPairNotGrouped"],
      }).getIssues(),
    ).toHaveLength(count)
  }
  expect(JSON.stringify(circuitJson)).toBe(original)
})
