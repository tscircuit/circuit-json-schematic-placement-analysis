import { expect, test } from "bun:test"
import { analyzeSchematicPlacement } from "lib/index"
import { createRailPathRepro } from "../assets/rail-path-visibility"
import { createIssueReproSnapshot } from "../fixtures/create-issue-repro-snapshot"

test("rail path visibility: long", () => {
  const circuitJson = createRailPathRepro()
  const analysis = analyzeSchematicPlacement(circuitJson, {
    issueTypes: ["RailPathTooSpreadOut"],
  })
  const issues = analysis.getIssues()
  expect(issues).toHaveLength(1)
  expect(issues[0]).toMatchObject({
    lineItemType: "RailPathTooSpreadOut",
    railType: "ground",
    sourcePortId: "host-sense",
    pathSpan: 13.7,
  })
  if (issues[0]?.lineItemType !== "RailPathTooSpreadOut")
    throw new Error("Missing finding")
  expect(issues[0].message).toContain("U_PD.VBUS_VS_DISCH")
  expect(issues[0].message).not.toContain(issues[0].sourcePortId)
  expect(analysis.schematicIssuesToString(issues[0])).toContain(
    'pinName="VBUS_VS_DISCH"',
  )
  expect(analysis.schematicIssuesToString(issues[0])).not.toContain(
    issues[0].sourcePortId,
  )
  expect(issues[0].pathLength).toBeCloseTo(23.2)
  expect(
    issues[0].supportSchematicBoxes.map((p) => p.sourceComponentName),
  ).toEqual(["R1", "R11", "R12"])
  expect(issues[0].schematicTraceIds).toContain("long-input-wire")
  expect(
    createIssueReproSnapshot({
      circuitJson,
      analysis,
      issueTypes: ["RailPathTooSpreadOut"],
      width: 1100,
      height: 750,
      showFullSchematic: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
