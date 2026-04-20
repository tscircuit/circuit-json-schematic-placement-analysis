import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"

import { analyzeAllSchematicPlacements } from "lib/index"

const circuit01Json = JSON.parse(
  readFileSync(new URL("./assets/circuit01.json", import.meta.url), "utf8"),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("circuit01 empty report snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(circuit01Json)

  expect(analysis.issueCount).toBe(0)
  expect(analysis.listIssues()).toEqual([])

  expect(analysis.toString()).toMatchInlineSnapshot(`
    "<SchematicPlacementAnalysisReport requestedTarget="all" resolvedTarget="all" targetKind="circuit" issueCount="0" highSeverityCount="0" mediumSeverityCount="0" lowSeverityCount="0" labelLabelOverlapCount="0" labelSymbolOverlapCount="0" textCrossesConnectionCount="0">
      <Issues>
      </Issues>
    </SchematicPlacementAnalysisReport>"
  `)
})
