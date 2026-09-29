import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { watchyI2cPullups } from "../assets/watchy-i2c-pullups"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("I2C net aliases do not duplicate a pull-up pair warning", () => {
  const circuitJson = structuredClone(watchyI2cPullups)
  for (const role of ["SDA", "SCL"]) {
    const originalNet = circuitJson.find(
      (element) => element.type === "source_net" && element.name === role,
    )
    if (originalNet?.type !== "source_net") throw new Error(`Missing ${role}`)
    const aliasId = `${originalNet.source_net_id}_alias`
    circuitJson.push(
      { ...originalNet, source_net_id: aliasId, name: `I2C_${role}` },
      {
        type: "source_trace",
        source_trace_id: `${aliasId}_connection`,
        connected_source_port_ids: [],
        connected_source_net_ids: [originalNet.source_net_id, aliasId],
      },
    )
  }
  const analysis = analyzeSchematicPlacement(circuitJson)
  expect(
    analysis.getIssues({ issueTypes: ["I2cPullupPairNotGrouped"] }),
  ).toHaveLength(1)
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      schematicSheetId: "schematic_sheet_3",
      issueTypes: ["I2cPullupPairNotGrouped"],
      width: 1000,
      height: 750,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
