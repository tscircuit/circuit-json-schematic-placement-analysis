import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const noErrorsJson = JSON.parse(
  readFileSync(new URL("./assets/no-errors.json", import.meta.url), "utf8"),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("no-errors empty report snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(noErrorsJson)

  expect(analysis.issueCount).toBe(0)
  expect(analysis.listIssues()).toEqual([])
  expect(
    convertCircuitJsonToSchematicSvg(noErrorsJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="0" highSeverityCount="0" mediumSeverityCount="0" lowSeverityCount="0" labelLabelOverlapCount="0" labelSymbolOverlapCount="0" textCrossesConnectionCount="0">
      <Issues>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
