import { readFileSync } from "node:fs"

import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

import { analyzeAllSchematicPlacements } from "lib/index"
import "./fixtures/extend-expect-any-svg"

const labelSymbolOverlapJson = JSON.parse(
  readFileSync(
    new URL("./assets/label-symbol-overlap.json", import.meta.url),
    "utf8",
  ),
) as readonly {
  type: string
  [key: string]: unknown
}[]

test("label symbol overlap snapshot", () => {
  const analysis = analyzeAllSchematicPlacements(labelSymbolOverlapJson)

  expect(analysis.issueCount).toBe(1)
  expect(analysis.highSeverityCount).toBe(1)
  expect(analysis.listIssues()[0]?.type).toBe("label_symbol_overlap")
  expect(
    convertCircuitJsonToSchematicSvg(labelSymbolOverlapJson as any),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(analysis.toString()).toMatchInlineSnapshot(`"<LabelSymbolOverlap severity="high" label="VREF" component="U1" left="-0.22" right="0.22" bottom="-0.13" top="0.13" width="0.45" height="0.25" />"`)
})
