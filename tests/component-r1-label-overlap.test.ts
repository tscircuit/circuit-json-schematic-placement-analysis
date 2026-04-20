import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeComponentSchematicPlacement } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const crowdedSchematicOverlapJson = JSON.parse(
  readFileSync(
    new URL("./assets/crowded-schematic-overlap.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("component r1 label overlap snapshot", () => {
  const analysis = analyzeComponentSchematicPlacement(
    crowdedSchematicOverlapJson,
    "R1",
  )
  const issueSummaries = analysis.listIssues().map((issue) => issue.summary)

  expect(analysis.issueCount).toBe(2)
  expect(issueSummaries).toEqual([
    "U1_VCP/C10_pin2 overlaps R1",
    "GND overlaps R1",
  ])
  expect(
    convertCircuitJsonToSchematicSvg(crowdedSchematicOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<LabelSymbolOverlap severity="high" label="U1_VCP/C10_pin2" component="R1" left="-0.55" right="0.55" bottom="-0.13" top="0.13" width="1.10" height="0.25" />

    <LabelSymbolOverlap severity="high" label="GND" component="R1" left="0.18" right="0.52" bottom="-0.09" top="0.17" width="0.33" height="0.25" />"
  `)
})
